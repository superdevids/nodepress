/**
 * Centralised CORS configuration for the NodePress API.
 *
 * Imported in `main.ts` when bootstrapping the NestJS Express app.
 */

export interface CorsConfig {
  origin: string | string[] | boolean;
  methods: string | string[];
  credentials: boolean;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
  maxAge: number;
}

export const corsConfig: CorsConfig = {
  origin: process.env.CORS_ORIGIN?.split(',') ?? [
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400,
};
