import { CommentStatus, type CommentData } from "./comment-service.js";

export interface ModerationRule {
  name: string;
  check: (comment: CommentData) => boolean | Promise<boolean>;
  action: ModerationAction;
  priority: number;
}

export type ModerationAction = "approve" | "pending" | "spam" | "trash";

export interface ModerationResult {
  status: CommentStatus;
  reason: string;
  appliedRules: string[];
}

export class CommentModeration {
  private rules: ModerationRule[] = [];
  private spamCheckers: Array<(comment: CommentData) => boolean | Promise<boolean>> = [];

  addRule(rule: ModerationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  removeRule(name: string): void {
    this.rules = this.rules.filter((r) => r.name !== name);
  }

  addSpamChecker(checker: (comment: CommentData) => boolean | Promise<boolean>): void {
    this.spamCheckers.push(checker);
  }

  removeSpamChecker(checker: (comment: CommentData) => boolean | Promise<boolean>): void {
    this.spamCheckers = this.spamCheckers.filter((c) => c !== checker);
  }

  async moderate(comment: CommentData): Promise<ModerationResult> {
    const appliedRules: string[] = [];

    for (const rule of this.rules) {
      const triggered = await rule.check(comment);
      if (!triggered) continue;

      appliedRules.push(rule.name);

      switch (rule.action) {
        case "approve":
          return { status: CommentStatus.APPROVED, reason: `Auto-approved by rule: ${rule.name}`, appliedRules };
        case "spam":
          return { status: CommentStatus.SPAM, reason: `Marked as spam by rule: ${rule.name}`, appliedRules };
        case "trash":
          return { status: CommentStatus.TRASHED, reason: `Trashed by rule: ${rule.name}`, appliedRules };
        case "pending":
          return { status: CommentStatus.PENDING, reason: `Held for moderation by rule: ${rule.name}`, appliedRules };
      }
    }

    const isSpam = await this.checkSpam(comment);
    if (isSpam) {
      return {
        status: CommentStatus.SPAM,
        reason: "Marked as spam by spam checker",
        appliedRules: [...appliedRules, "spam-checker"],
      };
    }

    return {
      status: CommentStatus.APPROVED,
      reason: "No moderation rules triggered",
      appliedRules,
    };
  }

  private async checkSpam(comment: CommentData): Promise<boolean> {
    for (const checker of this.spamCheckers) {
      const isSpam = await checker(comment);
      if (isSpam) return true;
    }
    return false;
  }

  getRules(): ModerationRule[] {
    return [...this.rules];
  }

  registerDefaultRules(): void {
    this.addRule({
      name: "auto-approve-known-user",
      priority: 1,
      check: (comment) => !!comment.userId && comment.commentType === "comment",
      action: "approve",
    });

    this.addRule({
      name: "hold-long-links",
      priority: 5,
      check: (comment) => {
        const linkCount = (comment.content.match(/https?:\/\//g) ?? []).length;
        return linkCount > 2;
      },
      action: "pending",
    });

    this.addRule({
      name: "hold-multiple-links-new-user",
      priority: 6,
      check: (comment) => {
        if (comment.userId) return false;
        const linkCount = (comment.content.match(/https?:\/\//g) ?? []).length;
        return linkCount > 1;
      },
      action: "pending",
    });

    this.addRule({
      name: "spam-suspicious-keywords",
      priority: 10,
      check: (comment) => {
        const spamKeywords = [
          "buy now", "click here", "free money", "act now",
          "limited offer", "casino", "crypto bonus",
        ];
        const lower = comment.content.toLowerCase();
        return spamKeywords.some((kw) => lower.includes(kw));
      },
      action: "spam",
    });
  }
}
