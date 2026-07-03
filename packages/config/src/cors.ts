/**
 * CORS configuration (Gap F-08)
 */

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

/**
 * Default CORS configuration for NodePress.
 * Origins are loaded from environment to allow flexible deployment.
 */
export function corsConfig(additionalOrigins: string[] = []): CorsConfig {
  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:4000",
  ];

  const envOrigins = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()) ?? [];

  return {
    allowedOrigins: [...defaultOrigins, ...envOrigins, ...additionalOrigins],
    allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
      "X-Api-Key",
    ],
    exposedHeaders: ["X-Total-Count", "X-RateLimit-Remaining"],
    credentials: true,
    maxAge: 86400, // 24 hours
  };
}
