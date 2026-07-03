/**
 * Fixture loading system.
 * Loads JSON fixture files from tests/fixtures/ directory.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

let FIXTURES_DIR = resolve(process.cwd(), "tests", "fixtures");

export interface FixtureCollection {
  [key: string]: unknown;
}

/**
 * Load a single JSON fixture file by name (with or without .json extension).
 */
export function loadFixture<T = unknown>(name: string): T {
  const fileName = name.endsWith(".json") ? name : `${name}.json`;
  const filePath = join(FIXTURES_DIR, fileName);

  if (!existsSync(filePath)) {
    throw new Error(`Fixture not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Load all JSON fixture files from the fixtures directory.
 */
export function loadAllFixtures(): FixtureCollection {
  if (!existsSync(FIXTURES_DIR)) {
    return {};
  }

  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
  const fixtures: FixtureCollection = {};

  for (const file of files) {
    const name = file.replace(/\.json$/, "");
    fixtures[name] = loadFixture(name);
  }

  return fixtures;
}

/**
 * Set custom fixtures directory path.
 */
export function setFixturesDir(dir: string): void {
  (FIXTURES_DIR as string) = resolve(dir);
}

/**
 * Sample rich content (ProseMirror doc format).
 */
export const sampleContent = {
  type: "doc" as const,
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Sample Heading" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This is a sample paragraph with " },
        { type: "text", marks: [{ type: "bold" }], text: "bold text" },
        { type: "text", text: " and " },
        { type: "text", marks: [{ type: "italic" }], text: "italic text" },
        { type: "text", text: "." },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item 1" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item 2" }] }] },
      ],
    },
  ],
};

/**
 * Sample HTML content for testing.
 */
export const sampleHtml = `
  <h2>Sample Heading</h2>
  <p>This is a sample paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
`;

/**
 * Sample WordPress-style shortcode content.
 */
export const sampleShortcodeContent = `
  [gallery ids="1,2,3" columns="3"]
  [audio src="track.mp3" /]
  This text has [bold]important[/bold] formatting.
`;

/**
 * Complete sample post data.
 */
export const samplePost = {
  title: "Hello World",
  slug: "hello-world",
  content: sampleHtml,
  excerpt: "This is a sample post excerpt.",
  status: "PUBLISHED",
  commentStatus: "open",
  pingStatus: "open",
  postFormat: "standard",
};
