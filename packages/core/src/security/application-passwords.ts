import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export interface AppPasswordData {
  id: string;
  userId: string;
  name: string;
  hashedPassword: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export class ApplicationPasswordsEngine {
  private readonly PREFIX = "nodepress_";

  generatePassword(length: number = 24): string {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";
    const bytes = crypto.randomBytes(length);
    let result = this.PREFIX;
    for (let i = 0; i < length; i++) {
      result += charset[bytes[i] % charset.length];
    }
    return result;
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  formatPassword(raw: string): string {
    if (!raw.startsWith(this.PREFIX)) {
      return `${this.PREFIX}${raw}`;
    }
    return raw;
  }

  isValidFormat(password: string): boolean {
    return password.startsWith(this.PREFIX) && password.length > this.PREFIX.length;
  }
}
