import crypto from "node:crypto";

export interface PasswordResetTokenData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class PasswordResetEngine {
  private readonly TOKEN_LENGTH = 32;
  private readonly TOKEN_EXPIRY_MS = 60 * 60 * 1000;

  generateToken(): { token: string; hashedToken: string; expiresAt: Date } {
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MS);
    return { token, hashedToken, expiresAt };
  }

  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  isTokenUsed(usedAt: Date | null): boolean {
    return usedAt !== null;
  }

  generateResetUrl(token: string, baseUrl?: string): string {
    const url = baseUrl || process.env.FRONTEND_URL || "http://localhost:5173";
    return `${url}/reset-password?token=${token}`;
  }
}
