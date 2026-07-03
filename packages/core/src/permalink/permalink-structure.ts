export type PermalinkTag =
  | "%year%"
  | "%monthnum%"
  | "%day%"
  | "%hour%"
  | "%minute%"
  | "%second%"
  | "%postname%"
  | "%post_id%"
  | "%category%"
  | "%tag%"
  | "%author%";

export const PERMALINK_TAGS: PermalinkTag[] = [
  "%year%", "%monthnum%", "%day%",
  "%hour%", "%minute%", "%second%",
  "%postname%", "%post_id%",
  "%category%", "%tag%", "%author%",
];

const TAG_REGEX = /%(\w+)%/g;

export interface PermalinkParts {
  year?: string;
  monthnum?: string;
  day?: string;
  hour?: string;
  minute?: string;
  second?: string;
  postname: string;
  post_id: string;
  category?: string;
  tag?: string;
  author?: string;
}

export interface ParsedStructure {
  pattern: string;
  tags: PermalinkTag[];
  regex: RegExp;
  paramNames: string[];
}

export function parseStructure(pattern: string): ParsedStructure {
  const tags: PermalinkTag[] = [];
  const paramNames: string[] = [];
  let match: RegExpExecArray | null;

  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(pattern)) !== null) {
    const tag = `%${match[1]}%` as PermalinkTag;
    if (isValidTag(tag)) {
      tags.push(tag);
      paramNames.push(match[1]!);
    }
  }

  let regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/%year%/g, "(?<year>\\d{4})")
    .replace(/%monthnum%/g, "(?<monthnum>\\d{1,2})")
    .replace(/%day%/g, "(?<day>\\d{1,2})")
    .replace(/%hour%/g, "(?<hour>\\d{1,2})")
    .replace(/%minute%/g, "(?<minute>\\d{1,2})")
    .replace(/%second%/g, "(?<second>\\d{1,2})")
    .replace(/%postname%/g, "(?<postname>[^/]+)")
    .replace(/%post_id%/g, "(?<post_id>\\d+)")
    .replace(/%category%/g, "(?<category>[^/]+)")
    .replace(/%tag%/g, "(?<tag>[^/]+)")
    .replace(/%author%/g, "(?<author>[^/]+)");

  regexStr = `^${regexStr}\/?$`;

  return {
    pattern,
    tags,
    regex: new RegExp(regexStr),
    paramNames,
  };
}

export function generateUrl(structure: ParsedStructure, parts: PermalinkParts): string {
  let url = structure.pattern;
  const now = new Date();

  const replacements: Record<string, string> = {
    "%year%": parts.year ?? String(now.getFullYear()),
    "%monthnum%": (parts.monthnum ?? String(now.getMonth() + 1)).padStart(2, "0"),
    "%day%": (parts.day ?? String(now.getDate())).padStart(2, "0"),
    "%hour%": (parts.hour ?? String(now.getHours())).padStart(2, "0"),
    "%minute%": (parts.minute ?? String(now.getMinutes())).padStart(2, "0"),
    "%second%": (parts.second ?? String(now.getSeconds())).padStart(2, "0"),
    "%postname%": encodeURIComponent(parts.postname),
    "%post_id%": parts.post_id,
    "%category%": parts.category ? encodeURIComponent(parts.category) : "uncategorized",
    "%tag%": parts.tag ? encodeURIComponent(parts.tag) : "",
    "%author%": parts.author ? encodeURIComponent(parts.author) : "author",
  };

  for (const [tag, value] of Object.entries(replacements)) {
    url = url.replaceAll(tag, value || "");
  }

  url = url.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  return url;
}

export function matchUrl(structure: ParsedStructure, url: string): Record<string, string> | null {
  const match = structure.regex.exec(url);
  if (!match || !match.groups) return null;

  const result: Record<string, string> = {};
  for (const name of structure.paramNames) {
    const value = match.groups[name];
    if (value) result[name] = value;
  }
  return result;
}

export function isValidTag(tag: string): tag is PermalinkTag {
  return (PERMALINK_TAGS as readonly string[]).includes(tag);
}

export function getDefaultStructures(): { label: string; pattern: string }[] {
  return [
    { label: "Day and name", pattern: "/%year%/%monthnum%/%day%/%postname%/" },
    { label: "Month and name", pattern: "/%year%/%monthnum%/%postname%/" },
    { label: "Numeric", pattern: "/archives/%post_id%" },
    { label: "Post name", pattern: "/%postname%/" },
    { label: "Plain", pattern: "/?p=%post_id%" },
    { label: "Category and name", pattern: "/%category%/%postname%/" },
    { label: "Author and name", pattern: "/%author%/%postname%/" },
  ];
}
