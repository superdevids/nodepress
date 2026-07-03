import crypto from "node:crypto";

export interface TwoFactorSecretData {
  secret: string;
  otpauthUrl: string;
  qrCode: string;
}

export interface BackupCodesData {
  codes: string[];
  hashedCodes: string[];
}

export class TwoFactorEngine {
  private readonly CODE_LENGTH = 6;
  private readonly BACKUP_CODE_COUNT = 8;
  private readonly BACKUP_CODE_LENGTH = 10;
  private readonly PERIOD = 30;

  generateSecret(): TwoFactorSecretData {
    const secret = crypto.randomBytes(20).toString("base64").replace(/=/g, "");
    const otpauthUrl = this.buildOtpauthUrl(secret);
    const qrCode = this.generateQrCodeData(otpauthUrl);
    return { secret, otpauthUrl, qrCode };
  }

  private buildOtpauthUrl(secret: string): string {
    const issuer = encodeURIComponent("NodePress");
    const user = encodeURIComponent("user@nodepress");
    return `otpauth://totp/${issuer}:${user}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${this.CODE_LENGTH}&period=${this.PERIOD}`;
  }

  private generateQrCodeData(otpauthUrl: string): string {
    const uri = encodeURIComponent(otpauthUrl);
    const size = 256;
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
      `  <rect width="${size}" height="${size}" fill="white"/>`,
      `  <text x="${size / 2}" y="${size / 2 - 10}" text-anchor="middle" font-family="monospace" font-size="12" fill="#333">Scan with your</text>`,
      `  <text x="${size / 2}" y="${size / 2 + 10}" text-anchor="middle" font-family="monospace" font-size="12" fill="#333">authenticator app</text>`,
      `  <text x="${size / 2}" y="${size / 2 + 40}" text-anchor="middle" font-family="monospace" font-size="8" fill="#666">or use the secret key</text>`,
      `</svg>`,
    ].join("\n");
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }

  generateBackupCodes(): BackupCodesData {
    const codes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const code = crypto.randomBytes(this.BACKUP_CODE_LENGTH).toString("hex").substring(0, this.BACKUP_CODE_LENGTH);
      codes.push(code);
      const hash = crypto.createHash("sha256").update(code).digest("hex");
      hashedCodes.push(hash);
    }

    return { codes, hashedCodes };
  }

  verifyToken(secret: string, token: string): boolean {
    if (token.length !== this.CODE_LENGTH) return false;
    if (!/^\d+$/.test(token)) return false;

    const counter = Math.floor(Date.now() / 1000 / this.PERIOD);
    const expected = this.generateTOTP(secret, counter);

    if (expected === token) return true;

    const prevCounter = counter - 1;
    const prevExpected = this.generateTOTP(secret, prevCounter);
    if (prevExpected === token) return true;

    return false;
  }

  private generateTOTP(secret: string, counter: number): string {
    const counterBuf = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
      counterBuf[i] = counter & 0xff;
      counter >>= 8;
    }

    const decodedSecret = Buffer.from(secret, "base64");
    const hmac = crypto.createHmac("sha1", decodedSecret).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const otp = binary % 1000000;
    return otp.toString().padStart(this.CODE_LENGTH, "0");
  }

  verifyBackupCode(code: string, hashedCodes: string[]): { valid: boolean; index: number } {
    const hash = crypto.createHash("sha256").update(code).digest("hex");
    const index = hashedCodes.indexOf(hash);
    if (index !== -1) {
      return { valid: true, index };
    }
    return { valid: false, index: -1 };
  }
}
