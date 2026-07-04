import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;

function deriveKey(encryptionKey: string, salt: Buffer): Buffer {
  return crypto.scryptSync(encryptionKey, salt, 32);
}

export class DbEncryption {
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
  }

  encrypt(plaintext: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(this.encryptionKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted format');
    }

    const saltHex = parts[0] as string;
    const ivHex = parts[1] as string;
    const authTagHex = parts[2] as string;
    const encrypted = parts[3] as string;

    const salt = Buffer.from(saltHex, 'hex');
    const key = deriveKey(this.encryptionKey, salt);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');

    return decrypted;
  }

  encryptObject<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
    const result = { ...obj };
    for (const field of fields) {
      const value = result[field];
      if (typeof value === 'string') {
        result[field] = this.encrypt(value) as T[keyof T];
      }
    }
    return result;
  }

  decryptObject<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
    const result = { ...obj };
    for (const field of fields) {
      const value = result[field];
      if (typeof value === 'string' && value.includes(':')) {
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
      throw new Error('DB_ENCRYPTION_KEY environment variable is required');
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
