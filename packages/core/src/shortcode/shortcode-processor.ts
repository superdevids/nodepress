import type { ShortcodeRegistry } from "./shortcode-registry.js";

interface ShortcodeMatch {
  tag: string;
  attrs: Record<string, string>;
  content: string | undefined;
  fullMatch: string;
  inner: string | undefined;
}

const SHORTCODE_RE = /\[(\w+)((?:\s+(?:\w+)(?:=(?:"[^"]*"|'[^']*'|\S+))?)*)\s*\](?:\s*((?:.|\n)*?)\s*\[\/\1\])?/g;

const ATTR_RE = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;

function parseAttributes(attrsStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!attrsStr.trim()) return attrs;
  let match: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrsStr)) !== null) {
    const key = match[1]!;
    const value = match[2] ?? match[3] ?? match[4] ?? key;
    attrs[key] = value;
  }
  return attrs;
}

function extractShortcodes(content: string): ShortcodeMatch[] {
  const matches: ShortcodeMatch[] = [];
  let match: RegExpExecArray | null;
  SHORTCODE_RE.lastIndex = 0;
  while ((match = SHORTCODE_RE.exec(content)) !== null) {
    const tag = match[1]!;
    const attrsStr = match[2] ?? "";
    const inner = match[3];
    const attrs = parseAttributes(attrsStr);
    const fullMatch = match[0]!;
    const innerContent = inner !== undefined ? inner.trim() : undefined;
    matches.push({ tag, attrs, content: innerContent, fullMatch, inner: innerContent });
  }
  return matches;
}

function hasNestedShortcodes(content: string): boolean {
  SHORTCODE_RE.lastIndex = 0;
  return SHORTCODE_RE.test(content);
}

async function processShortcode(
  registry: ShortcodeRegistry,
  sm: ShortcodeMatch,
  context: Record<string, unknown>,
): Promise<string> {
  const def = registry.getShortcode(sm.tag);
  if (!def) return sm.fullMatch;

  let innerContent = sm.inner;

  if (innerContent && hasNestedShortcodes(innerContent)) {
    innerContent = await doShortcode(registry, innerContent, context);
  }

  const result = await def.handler(sm.attrs, innerContent);
  return result ?? "";
}

export async function processContent(
  registry: ShortcodeRegistry,
  text: string,
  context: Record<string, unknown> = {},
): Promise<string> {
  if (!text) return text;
  return doShortcode(registry, text, context);
}

export async function doShortcode(
  registry: ShortcodeRegistry,
  text: string,
  context: Record<string, unknown> = {},
): Promise<string> {
  if (!text) return text;

  const maxIterations = 10;
  let iteration = 0;
  let result = text;

  while (iteration < maxIterations) {
    const matches = extractShortcodes(result);
    if (matches.length === 0) break;

    for (const sm of matches) {
      const rendered = await processShortcode(registry, sm, context);
      result = result.split(sm.fullMatch).join(rendered);
    }

    iteration++;
  }

  return result;
}

export function stripShortcodes(text: string): string {
  if (!text) return text;
  return text.replace(/\[(\w+)[^\]]*\](?:[^[]*?\[\/\1\])?/g, "").trim();
}
