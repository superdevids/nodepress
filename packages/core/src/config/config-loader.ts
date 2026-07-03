import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface AppConfig {
  appUrl: string;
  appEnv: string;
  port: number;
  dbUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: number;
  jwtIssuer: string;
  mailProvider: string;
  mailFrom: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  mediaDir: string;
  mediaMaxFileSize: number;
  mediaAllowedTypes: string[];
  cacheTtlDefault: number;
  logLevel: string;
  redisUrl: string;
}

const DEFAULTS: AppConfig = {
  appUrl: "http://localhost:3000",
  appEnv: "development",
  port: 3000,
  dbUrl: "postgresql://localhost:5432/nodepress",
  jwtSecret: "",
  jwtRefreshSecret: "",
  jwtExpiresIn: 900,
  jwtIssuer: "nodepress",
  mailProvider: "smtp",
  mailFrom: "noreply@nodepress.local",
  smtpHost: "localhost",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPass: "",
  mediaDir: "uploads",
  mediaMaxFileSize: 10485760,
  mediaAllowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "application/pdf"],
  cacheTtlDefault: 3600,
  logLevel: "info",
  redisUrl: "",
};

function loadEnvFile(path: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!existsSync(path)) return result;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export class ConfigLoader {
  private config: AppConfig;

  constructor() {
    const envFile = join(process.cwd(), ".env");
    const envVars = loadEnvFile(envFile);
    this.config = { ...DEFAULTS };

    for (const [key, value] of Object.entries(envVars)) {
      this.applyEnvVar(key, value);
    }
    for (const key of Object.keys(process.env)) {
      this.applyEnvVar(key, process.env[key]!);
    }
  }

  private applyEnvVar(key: string, value: string): void {
    switch (key) {
      case "APP_URL": this.config.appUrl = value; break;
      case "NODE_ENV": this.config.appEnv = value; break;
      case "PORT": this.config.port = parseInt(value, 10) || DEFAULTS.port; break;
      case "DATABASE_URL": this.config.dbUrl = value; break;
      case "JWT_SECRET": this.config.jwtSecret = value; break;
      case "JWT_REFRESH_SECRET": this.config.jwtRefreshSecret = value; break;
      case "JWT_EXPIRES_IN": this.config.jwtExpiresIn = parseInt(value, 10) || DEFAULTS.jwtExpiresIn; break;
      case "JWT_ISSUER": this.config.jwtIssuer = value; break;
      case "MAIL_PROVIDER": this.config.mailProvider = value; break;
      case "MAIL_FROM": this.config.mailFrom = value; break;
      case "SMTP_HOST": this.config.smtpHost = value; break;
      case "SMTP_PORT": this.config.smtpPort = parseInt(value, 10) || DEFAULTS.smtpPort; break;
      case "SMTP_SECURE": this.config.smtpSecure = value === "true"; break;
      case "SMTP_USER": this.config.smtpUser = value; break;
      case "SMTP_PASS": this.config.smtpPass = value; break;
      case "MEDIA_DIR": this.config.mediaDir = value; break;
      case "MEDIA_MAX_FILE_SIZE": this.config.mediaMaxFileSize = parseInt(value, 10) || DEFAULTS.mediaMaxFileSize; break;
      case "MEDIA_ALLOWED_TYPES": this.config.mediaAllowedTypes = value.split(",").map((s) => s.trim()); break;
      case "CACHE_TTL_DEFAULT": this.config.cacheTtlDefault = parseInt(value, 10) || DEFAULTS.cacheTtlDefault; break;
      case "LOG_LEVEL": this.config.logLevel = value; break;
      case "REDIS_URL": this.config.redisUrl = value; break;
    }
  }

  get<T extends keyof AppConfig>(key: T): AppConfig[T] {
    return this.config[key];
  }

  getAll(): AppConfig {
    return { ...this.config };
  }
}
