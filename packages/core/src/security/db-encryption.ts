import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class DbEncryption {
  private key: Buffer;

  constructor(encryptionKey: string) {
    this.key = crypto.scryptSync(encryptionKey, "nodepress-db-salt", 32);
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  encryptObject<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[],
  ): T {
    const result = { ...obj };
    for (const field of fields) {
      const value = result[field];
      if (typeof value === "string") {
        result[field] = this.encrypt(value) as T[keyof T];
      }
    }
    return result;
  }

  decryptObject<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[],
  ): T {
    const result = { ...obj };
    for (const field of fields) {
      const value = result[field];
      if (typeof value === "string" && value.includes(":")) {
        try {
          result[field] = this.decrypt(value) as T[keyof T];
        } catch {
          // If decryption fails, leave original value
        }
      }
    }
    return result;
  }
}

let instance: DbEncryption | null = null;

export function getDbEncryption(): DbEncryption {
  if (!instance) {
    const key = process.env.DB_ENCRYPTION_KEY || process.env.NODEPRESS_DB_ENCRYPTION_KEY;
    if (!key) {
      throw new Error("DB_ENCRYPTION_KEY environment variable is required");
    }
    instance = new DbEncryption(key);
  }
  return instance;
}

export function encryptField(value: string): string {
  return getDbEncryption().encrypt(value);
}

export function decryptField(value: string): string {
  return getDbEncryption().decrypt(value);
}
