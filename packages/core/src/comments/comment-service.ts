import { createHash } from "node:crypto";
import type { CacheService } from "../cache/cache-service.js";

export enum CommentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  SPAM = "SPAM",
  TRASHED = "TRASHED",
}

export interface CommentData {
  id?: string;
  entryId: string;
  userId?: string | null;
  authorName: string;
  authorEmail: string;
  authorUrl?: string;
  content: string;
  status?: CommentStatus;
  parentId?: string | null;
  userAgent?: string;
  ipAddress?: string;
  commentType?: string;
  createdAt?: Date;
}

export interface CommentTree {
  comment: CommentData;
  children: CommentTree[];
  depth: number;
}

export interface GravatarProfile {
  hash: string;
  url: string;
  avatarUrl: string;
  avatarSize: number;
}

export class CommentService {
  private cache: CacheService | null;

  constructor(cache?: CacheService) {
    this.cache = cache ?? null;
  }

  setCache(cache: CacheService): void {
    this.cache = cache;
  }

  getGravatarUrl(email: string, size: number = 80): GravatarProfile {
    const hash = createHash("md5").update(email.toLowerCase().trim()).digest("hex");
    return {
      hash,
      url: `https://www.gravatar.com/${hash}`,
      avatarUrl: `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp&r=g`,
      avatarSize: size,
    };
  }

  buildCommentTree(comments: CommentData[]): CommentTree[] {
    const map = new Map<string, CommentTree>();
    const roots: CommentTree[] = [];

    for (const comment of comments) {
      map.set(comment.id!, {
        comment,
        children: [],
        depth: 0,
      });
    }

    for (const comment of comments) {
      const node = map.get(comment.id!);
      if (!node) continue;

      if (comment.parentId && map.has(comment.parentId)) {
        const parent = map.get(comment.parentId)!;
        node.depth = parent.depth + 1;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  flattenCommentTree(tree: CommentTree[], maxDepth: number = 5): CommentData[] {
    const result: CommentData[] = [];

    function walk(nodes: CommentTree[], depth: number) {
      if (depth > maxDepth) return;
      for (const node of nodes) {
        result.push(node.comment);
        walk(node.children, depth + 1);
      }
    }

    walk(tree, 0);
    return result;
  }

  getCommentDepth(commentId: string, tree: CommentTree[]): number {
    for (const node of tree) {
      if (node.comment.id === commentId) return node.depth;
      const depth = this.getCommentDepth(commentId, node.children);
      if (depth >= 0) return depth + 1;
    }
    return -1;
  }

  getMaxCommentDepth(tree: CommentTree[]): number {
    let max = 0;
    for (const node of tree) {
      if (node.depth > max) max = node.depth;
      const childMax = this.getMaxCommentDepth(node.children);
      if (childMax > max) max = childMax;
    }
    return max;
  }

  filterByStatus(comments: CommentData[], status: CommentStatus): CommentData[] {
    return comments.filter((c) => c.status === status);
  }

  async getCachedCount(entryId: string): Promise<number | null> {
    if (!this.cache) return null;
    return this.cache.get<number>(`comment:count:${entryId}`);
  }

  async setCachedCount(entryId: string, count: number): Promise<void> {
    if (!this.cache) return;
    await this.cache.set(`comment:count:${entryId}`, count, {
      tags: ["comments", `entry:${entryId}`],
    });
  }
}
