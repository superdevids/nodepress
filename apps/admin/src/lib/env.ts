import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    API_URL: z.string().url().default("http://localhost:3001/api"),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001/api"),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_ADMIN_TITLE: z.string().default("NodePress Admin"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_ADMIN_TITLE: process.env.NEXT_PUBLIC_ADMIN_TITLE,
  },
});
