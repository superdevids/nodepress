export interface CorsConfigDetail {
  allowedOrigins: string[];
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  mode: 'restrictive' | 'permissive';
}

export class CorsConfigService {
  private config: CorsConfigDetail;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): CorsConfigDetail {
    const envOrigins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
    const mode = (process.env.CORS_MODE as 'restrictive' | 'permissive') || 'restrictive';

    return {
      allowedOrigins: envOrigins ?? ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID', 'X-Forwarded-For'],
      exposedHeaders: ['X-Correlation-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      credentials: true,
      maxAge: 86400,
      mode,
    };
  }

  getConfig(): CorsConfigDetail {
    return { ...this.config };
  }

  updateAllowedOrigins(origins: string[]): void {
    this.config.allowedOrigins = origins;
  }

  getOriginPredicate(): (origin: string, callback: (err: Error | null, allow?: boolean) => void) => void {
    return (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      if (this.config.mode === 'permissive') {
        callback(null, true);
        return;
      }

      if (!origin) {
        callback(null, true);
        return;
      }

      const allowed = this.config.allowedOrigins.some((allowedOrigin) => {
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          return new RegExp(`^${pattern}$`).test(origin);
        }
        return allowedOrigin === origin;
      });

      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin "${origin}" not allowed by CORS`));
      }
    };
  }
}

export const corsConfigService = new CorsConfigService();
