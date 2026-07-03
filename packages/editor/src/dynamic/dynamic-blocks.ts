import { blockRegistry } from "../block-api.js";
import type { DynamicBlockDef, DynamicBlockContext } from "../types.js";

export type { DynamicBlockDef, DynamicBlockContext } from "../types.js";

export function registerDynamicBlock(def: DynamicBlockDef): void {
  blockRegistry.registerDynamicBlock(def);
}

export function getDynamicBlock(name: string): DynamicBlockDef | undefined {
  return blockRegistry.getDynamicBlock(name);
}

export function getDynamicBlocks(): DynamicBlockDef[] {
  return blockRegistry.getDynamicBlocks();
}

export function getCacheKey(blockName: string, attrs: Record<string, unknown>): string {
  const serialized = JSON.stringify(attrs, Object.keys(attrs).sort());
  return `dynamic-block:${blockName}:${serialized}`;
}

export async function renderDynamicBlock(
  def: DynamicBlockDef,
  attrs: Record<string, unknown>,
  context: DynamicBlockContext,
): Promise<string> {
  const cacheKey = getCacheKey(def.name, attrs);
  let html: string | undefined;

  try {
    if (context.redis && typeof context.redis === "object") {
      const redis = context.redis as { get: (key: string) => Promise<string | null> };
      html = (await redis.get(cacheKey)) ?? undefined;
    }
  } catch {
  }

  if (html) return html;

  try {
    html = await def.render(attrs, context);
  } catch {
    html = getFallbackRender(def.name);
  }

  try {
    if (context.redis && html) {
      const redis = context.redis as {
        set: (key: string, value: string, mode: string, ttl: number) => Promise<void>;
      };
      const ttl = def.cacheTTL ?? 3600;
      await redis.set(cacheKey, html, "EX", ttl);
    }
  } catch {
  }

  return html ?? "";
}

function getFallbackRender(blockName: string): string {
  const fallbacks: Record<string, string> = {
    "recent-posts": '<div class="dynamic-block-fallback">Unable to load recent posts.</div>',
    "latest-comments": '<div class="dynamic-block-fallback">Unable to load comments.</div>',
    "related-posts": '<div class="dynamic-block-fallback">Unable to load related posts.</div>',
    "featured-content": '<div class="dynamic-block-fallback">Unable to load featured content.</div>',
    archives: '<div class="dynamic-block-fallback">Unable to load archives.</div>',
    calendar: '<div class="dynamic-block-fallback">Unable to load calendar.</div>',
  };
  return fallbacks[blockName] ?? '<div class="dynamic-block-fallback">Dynamic block unavailable.</div>';
}

registerDynamicBlock({
  name: "recent-posts",
  title: "Recent Posts",
  icon: "list",
  category: "widgets",
  description: "Display a list of your most recent posts.",
  attributes: {
    count: { type: "number", default: 5 },
    postType: { type: "string", default: "post" },
    showExcerpt: { type: "boolean", default: false },
    showDate: { type: "boolean", default: true },
  },
  supports: { align: true },
  cacheTTL: 300,
  render: async (attrs) => {
    const count = (attrs?.count as number) ?? 5;
    const showExcerpt = (attrs?.showExcerpt as boolean) ?? false;
    const showDate = (attrs?.showDate as boolean) ?? true;
    const postType = (attrs?.postType as string) ?? "post";
    let items = "";
    for (let i = 1; i <= count; i++) {
      items += `<li class="recent-post-item"><a href="/${postType}/sample-post-${i}">Sample Post ${i}</a>${showDate ? `<span class="post-date">July ${i}, 2026</span>` : ""}${showExcerpt ? `<p class="post-excerpt">This is a sample excerpt for post ${i}.</p>` : ""}</li>`;
    }
    return `<ul class="wp-block-recent-posts">${items}</ul>`;
  },
});

registerDynamicBlock({
  name: "latest-comments",
  title: "Latest Comments",
  icon: "comment",
  category: "widgets",
  description: "Display your most recent comments.",
  attributes: {
    count: { type: "number", default: 5 },
    showAvatar: { type: "boolean", default: true },
    showPostTitle: { type: "boolean", default: true },
  },
  supports: { align: true },
  cacheTTL: 300,
  render: async (attrs) => {
    const count = (attrs?.count as number) ?? 5;
    const showAvatar = (attrs?.showAvatar as boolean) ?? true;
    const showPostTitle = (attrs?.showPostTitle as boolean) ?? true;
    let items = "";
    for (let i = 1; i <= count; i++) {
      items += `<li class="comment-item">${showAvatar ? `<img class="comment-avatar" src="https://ui-avatars.com/api/?name=Commenter+${i}&size=32" alt="" width="32" height="32" />` : ""}<span class="comment-author">Commenter ${i}</span>${showPostTitle ? `<span class="comment-post">on <a href="/post/sample">Sample Post</a></span>` : ""}<p class="comment-excerpt">This is a sample comment ${i}...</p></li>`;
    }
    return `<ul class="wp-block-latest-comments">${items}</ul>`;
  },
});

registerDynamicBlock({
  name: "related-posts",
  title: "Related Posts",
  icon: "related",
  category: "widgets",
  description: "Display posts related to the current entry.",
  attributes: {
    count: { type: "number", default: 3 },
    matchCategories: { type: "boolean", default: true },
    matchTags: { type: "boolean", default: true },
  },
  supports: { align: true },
  cacheTTL: 600,
  render: async (attrs) => {
    const count = (attrs?.count as number) ?? 3;
    let items = "";
    for (let i = 1; i <= count; i++) {
      items += `<div class="related-post-card"><a href="/post/related-${i}"><h4>Related Post ${i}</h4></a><p>This is a related post suggestion.</p></div>`;
    }
    return `<div class="wp-block-related-posts">${items}</div>`;
  },
});

registerDynamicBlock({
  name: "featured-content",
  title: "Featured Content",
  icon: "star",
  category: "widgets",
  description: "Showcase featured or sticky content.",
  attributes: {
    count: { type: "number", default: 3 },
    contentType: { type: "string", default: "post" },
    layout: { type: "string", default: "grid" },
  },
  supports: { align: true },
  cacheTTL: 600,
  render: async (attrs) => {
    const count = (attrs?.count as number) ?? 3;
    const layout = (attrs?.layout as string) ?? "grid";
    let items = "";
    for (let i = 1; i <= count; i++) {
      items += `<article class="featured-content-card"><div class="featured-image" style="background:#e5e7eb;height:200px"></div><h3><a href="/post/featured-${i}">Featured Content ${i}</a></h3><p>Featured content description ${i}.</p></article>`;
    }
    return `<div class="wp-block-featured-content ${layout}">${items}</div>`;
  },
});

registerDynamicBlock({
  name: "archives",
  title: "Archives",
  icon: "archive",
  category: "widgets",
  description: "Display a monthly archive listing.",
  attributes: {
    type: { type: "string", default: "monthly" },
    showCount: { type: "boolean", default: true },
    limit: { type: "number", default: 12 },
  },
  supports: { align: true },
  cacheTTL: 86400,
  render: async (attrs) => {
    const showCount = (attrs?.showCount as boolean) ?? true;
    const limitValue = (attrs?.limit as number) ?? 12;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let items = "";
    for (let i = 0; i < Math.min(limitValue, months.length); i++) {
      const postCount = Math.floor(Math.random() * 20) + 1;
      const monthName = months[i]!;
      items += `<li><a href="/${monthName.toLowerCase().substring(0, 3)}">${monthName} 2026</a>${showCount ? `<span class="archive-count">(${postCount})</span>` : ""}</li>`;
    }
    return `<ul class="wp-block-archives">${items}</ul>`;
  },
});

registerDynamicBlock({
  name: "calendar",
  title: "Calendar",
  icon: "calendar",
  category: "widgets",
  description: "Display a calendar of your site posts.",
  attributes: {
    month: { type: "number" },
    year: { type: "number" },
  },
  supports: { align: true },
  cacheTTL: 3600,
  render: async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let cells = `<tr><th class="calendar-nav" colspan="7"><a class="prev" href="#">\u00AB</a> ${monthNames[month]} ${year} <a class="next" href="#">\u00BB</a></th></tr><tr>`;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (const d of dayNames) cells += `<th class="calendar-day-name">${d}</th>`;
    cells += "</tr><tr>";
    for (let i = 0; i < firstDay; i++) cells += '<td class="calendar-empty"></td>';
    for (let day = 1; day <= daysInMonth; day++) {
      if ((day + firstDay - 1) % 7 === 0 && day > 1) cells += "</tr><tr>";
      const hasPost = day % 3 === 0;
      cells += hasPost ? `<td class="calendar-day has-post"><a href="/${year}/${String(month + 1).padStart(2, "0")}/${String(day).padStart(2, "0")}">${day}</a></td>` : `<td class="calendar-day">${day}</td>`;
    }
    cells += "</tr>";
    return `<table class="wp-block-calendar">${cells}</table>`;
  },
});