import { createHash } from "node:crypto";

export interface WhitelistedCommenter {
  email: string;
  emailHash: string;
  userId?: string;
  approvedCount: number;
  lastApprovedAt?: Date;
  bypassModeration: boolean;
}

export class CommentWhitelist {
  private whitelist: Map<string, WhitelistedCommenter> = new Map();
  private minApprovedCount: number;

  constructor(minApprovedCount: number = 3) {
    this.minApprovedCount = minApprovedCount;
  }

  setMinApprovedCount(count: number): void {
    this.minApprovedCount = count;
  }

  addToWhitelist(commenter: WhitelistedCommenter): void {
    const emailHash = this.hashEmail(commenter.email);
    this.whitelist.set(emailHash, {
      ...commenter,
      emailHash,
    });
  }

  removeFromWhitelist(email: string): void {
    const emailHash = this.hashEmail(email);
    this.whitelist.delete(emailHash);
  }

  isWhitelisted(email: string): boolean {
    const emailHash = this.hashEmail(email);
    const entry = this.whitelist.get(emailHash);
    if (!entry) return false;
    if (!entry.bypassModeration) return false;
    return entry.approvedCount >= this.minApprovedCount;
  }

  canBypassModeration(email: string, userId?: string): boolean {
    const emailHash = this.hashEmail(email);
    const entry = this.whitelist.get(emailHash);
    if (!entry) return false;
    if (userId && entry.userId && entry.userId !== userId) return false;
    return entry.bypassModeration && entry.approvedCount >= this.minApprovedCount;
  }

  incrementApprovedCount(email: string): void {
    const emailHash = this.hashEmail(email);
    const entry = this.whitelist.get(emailHash);
    if (entry) {
      entry.approvedCount++;
      entry.lastApprovedAt = new Date();
      if (entry.approvedCount >= this.minApprovedCount) {
        entry.bypassModeration = true;
      }
    }
  }

  getWhitelistEntry(email: string): WhitelistedCommenter | undefined {
    const emailHash = this.hashEmail(email);
    return this.whitelist.get(emailHash);
  }

  getAllWhitelisted(): WhitelistedCommenter[] {
    return Array.from(this.whitelist.values()).filter((e) => e.bypassModeration);
  }

  getWhitelistCount(): number {
    return Array.from(this.whitelist.values()).filter((e) => e.bypassModeration).length;
  }

  clear(): void {
    this.whitelist.clear();
  }

  private hashEmail(email: string): string {
    return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
  }
}
