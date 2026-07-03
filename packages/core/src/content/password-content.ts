import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export interface PasswordContentEntry {
  id: string;
  postPassword: string | null;
  slug: string;
}

export interface UnlockResult {
  unlocked: boolean;
  message?: string;
  token?: string;
}

const SESSION_COOKIE_PREFIX = "np_unlock_";
const UNLOCK_TTL = 3600 * 1000;

export class PasswordContent {
  private sessions: Map<string, { entryId: string; expiresAt: number }> = new Map();

  isProtected(entry: PasswordContentEntry): boolean {
    return !!entry.postPassword && entry.postPassword.length > 0;
  }

  /**
   * Hash a password for storage using bcrypt.
   */
  hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  /**
   * Create or re-hash the entry's password for storage.
   */
  prepareEntry(entry: { postPassword: string | null }): { postPassword: string } | null {
    if (!entry.postPassword) return null;
    return { postPassword: this.hashPassword(entry.postPassword) };
  }

  verifyPassword(entry: PasswordContentEntry, password: string): boolean {
    if (!entry.postPassword) return false;
    try {
      return bcrypt.compareSync(password, entry.postPassword);
    } catch {
      return false;
    }
  }

  unlock(entry: PasswordContentEntry, password: string): UnlockResult {
    if (!this.isProtected(entry)) {
      return { unlocked: true, message: "Content is not password protected" };
    }

    if (!this.verifyPassword(entry, password)) {
      return { unlocked: false, message: "Incorrect password" };
    }

    const token = this.createSession(entry.id);
    return { unlocked: true, token };
  }

  private createSession(entryId: string): string {
    const token = randomBytes(32).toString("hex");
    this.sessions.set(token, {
      entryId,
      expiresAt: Date.now() + UNLOCK_TTL,
    });
    return token;
  }

  isUnlocked(entryId: string, token?: string): boolean {
    if (!token) return false;

    const session = this.sessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return false;
    }

    return session.entryId === entryId;
  }

  extendSession(token: string): boolean {
    const session = this.sessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      return false;
    }
    session.expiresAt = Date.now() + UNLOCK_TTL;
    return true;
  }

  revokeSession(token: string): void {
    this.sessions.delete(token);
  }

  getSessionCookieName(entryId: string): string {
    return `${SESSION_COOKIE_PREFIX}${entryId}`;
  }

  middleware(entry: PasswordContentEntry, token?: string): { allowed: boolean; reason?: string } {
    if (!this.isProtected(entry)) {
      return { allowed: true };
    }

    if (this.isUnlocked(entry.id, token)) {
      return { allowed: true };
    }

    return { allowed: false, reason: "This content is password protected" };
  }

  getProtectedPreview(content: string): string {
    return `<div class="password-protected-preview"><p>This content is password protected. Please enter the password to view.</p></div>`;
  }

  cleanExpiredSessions(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }
}
