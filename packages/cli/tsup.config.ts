import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2022",
  clean: true,
  sourcemap: true,
  minify: process.env.NODE_ENV === "production",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
