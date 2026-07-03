export const NODEPRESS_API_PREFIX = "api";

export const NODEPRESS_SWAGGER_TITLE = "NodePress API";
export const NODEPRESS_SWAGGER_DESCRIPTION = "Headless CMS API for NodePress";
export const NODEPRESS_SWAGGER_VERSION = "0.1.0";
export const NODEPRESS_SWAGGER_PATH = "docs";

export const JWT_ACCESS_TOKEN_EXPIRES_IN = "15m";
export const JWT_REFRESH_TOKEN_EXPIRES_IN = "7d";
export const JWT_ISSUER = "nodepress";

export const AUTH_TOKEN_EXPIRY = 15 * 60 * 1000;
export const REFRESH_TOKEN_EXPIRY_REMEMBER = 14 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_EXPIRY_DEFAULT = 24 * 60 * 60 * 1000;

export const THROTTLE_TTL = 60;
export const THROTTLE_LIMIT = 100;

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX = 100;
export const RATE_LIMIT_LOGIN_MAX = 5;
export const RATE_LIMIT_LOGIN_WINDOW = 60 * 1000;
export const RATE_LIMIT_CREATE_MAX = 30;
export const RATE_LIMIT_READ_MAX = 1000;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HISTORY_COUNT = 5;
export const PASSWORD_EXPIRY_DAYS = 90;

export const RECOVERY_TOKEN_EXPIRY = 30 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_EXPIRY = 60 * 60 * 1000;

export const CONTENT_TYPES = ["post", "page", "revision"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CACHE_TTL_DEFAULT = 300;
export const CACHE_TTL_LONG = 3600;

export const TRUSTED_HOSTS_DEFAULT = ["localhost", "127.0.0.1", "::1"];

export const MAINTENANCE_MODE_HEADER = "X-NodePress-Maintenance";
