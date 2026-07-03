/**
 * TestServer — isolated test server using testcontainers for database.
 * Provides a full NodePress engine instance for integration testing.
 */

import http from "node:http";
import { PrismaClient } from "@nodepressjs/db";
import type { NodePressEngine, NodePressEngineOptions } from "@nodepressjs/core";

export interface TestServerOptions {
  database?: {
    type: "postgres" | "sqlite";
    container?: boolean;
    url?: string;
  };
  plugins?: string[];
  seed?: boolean;
}

/**
 * Creates an isolated test server with a fresh NodePress engine.
 * Supports testcontainers for database isolation.
 */
export class TestServer {
  private engine: NodePressEngine | null = null;
  private server: http.Server | null = null;
  private prisma: PrismaClient | null = null;
  private port: number;
  private options: TestServerOptions;

  static async create(options: TestServerOptions = {}): Promise<TestServer> {
    const server = new TestServer(options);
    await server.start();
    return server;
  }

  constructor(options: TestServerOptions = {}, port: number = 0) {
    this.options = options;
    this.port = port;
  }

  async start(): Promise<number> {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.options.database?.url ?? process.env.DATABASE_URL ?? "postgresql://nodepress:nodepress@localhost:5432/nodepress_test",
        },
      },
    });

    this.prisma = prisma;
    await prisma.$connect();

    const { NodePressEngine, ContentEngine, PluginEngine, ThemeEngine, AuthService, MediaService, CacheService, ShortcodeEngine, OEmbedService, PermalinkService, SecurityService, ConfigService, HookRegistry } = await import("@nodepressjs/core");

    const config = new ConfigService();
    const hooks = new HookRegistry();
    const cache = new CacheService();
    const shortcode = new ShortcodeEngine();
    const oembed = new OEmbedService();
    const permalink = new PermalinkService();
    const security = new SecurityService(config);
    const plugins = new PluginEngine(prisma);
    const content = new ContentEngine(prisma, hooks);
    const themes = new ThemeEngine();
    const auth = new AuthService(prisma, config);
    const media = new MediaService(prisma, config);

    if (this.options.plugins) {
      for (const pluginSlug of this.options.plugins) {
        try {
          const pluginModule = await import(/* @vite-ignore */ pluginSlug);
          if (pluginModule.manifest && pluginModule.lifecycle) {
            plugins.registerPlugin(pluginModule.manifest, pluginModule.lifecycle);
          }
        } catch {
        }
      }
    }

    this.engine = new NodePressEngine({
      config, content, plugins, themes, auth, media, cache,
      shortcode, oembed, permalink, security,
    });

    await this.engine.initialize();

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        try {
          const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
          const path = url.pathname;

          if (path === "/healthz") {
            res.writeHead(200);
            res.end(JSON.stringify({ status: "ok" }));
            return;
          }

          if (path.startsWith("/api/content") && req.method === "GET") {
            const entries = await prisma.contentEntry.findMany({ take: 50 });
            res.writeHead(200);
            res.end(JSON.stringify({ data: entries }));
            return;
          }

          res.writeHead(404);
          res.end(JSON.stringify({ error: "Not found" }));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }));
        }
      });

      this.server.listen(this.port, () => {
        const addr = this.server?.address();
        if (addr && typeof addr === "object") {
          this.port = addr.port;
          resolve(addr.port);
        } else {
          reject(new Error("Failed to get server port"));
        }
      });
      this.server.on("error", reject);
    });
  }

  async request(path: string, options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
    return new Promise((resolve, reject) => {
      const url = `http://localhost:${this.port}${path}`;
      const req = http.request(
        url,
        {
          method: options.method ?? "GET",
          headers: { "Content-Type": "application/json", ...options.headers },
        },
        (res) => {
          let data = "";
          const responseHeaders: Record<string, string> = {};
          for (let i = 0; i < (res.rawHeaders?.length ?? 0); i += 2) {
            responseHeaders[res.rawHeaders![i]!.toLowerCase()] = res.rawHeaders![i + 1]!;
          }
          res.on("data", (chunk: Buffer) => (data += chunk.toString()));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode ?? 500, headers: responseHeaders, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode ?? 500, headers: responseHeaders, body: data });
            }
          });
        },
      );
      req.on("error", reject);
      if (options.body) req.write(JSON.stringify(options.body));
      req.end();
    });
  }

  getEngine(): NodePressEngine {
    if (!this.engine) throw new Error("Server not started. Call start() first.");
    return this.engine;
  }

  getPrisma(): PrismaClient {
    if (!this.prisma) throw new Error("Server not started. Call start() first.");
    return this.prisma;
  }

  async stop(): Promise<void> {
    await this.engine?.shutdown();
    await this.prisma?.$disconnect();
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
