import type { PrismaClient } from "@nodepress/db";

export const PREVIEW_COOKIE_NAME = "nodepress_preview_theme";

export interface ThemePreviewState {
  themeSlug: string;
  nonce: string;
  activatedAt: number;
  expiresAt: number;
}

export class ThemePreviewManager {
  private prisma: PrismaClient;
  private sessions: Map<string, ThemePreviewState> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  createPreviewSession(themeSlug: string, ttlMs: number = 3600000): ThemePreviewState {
    const now = Date.now();
    const state: ThemePreviewState = {
      themeSlug,
      nonce: this.generateNonce(),
      activatedAt: now,
      expiresAt: now + ttlMs,
    };
    this.sessions.set(state.nonce, state);
    return state;
  }

  getPreviewTheme(nonce: string): string | null {
    const state = this.sessions.get(nonce);
    if (!state) return null;
    if (Date.now() > state.expiresAt) {
      this.sessions.delete(nonce);
      return null;
    }
    return state.themeSlug;
  }

  validateNonce(nonce: string): boolean {
    const state: ThemePreviewState | undefined = this.sessions.get(nonce);
    return !!state && Date.now() < state.expiresAt;
  }

  endPreviewSession(nonce: string): void {
    this.sessions.delete(nonce);
  }

  getActivePreviewSessions(): ThemePreviewState[] {
    const now = Date.now();
    const active: ThemePreviewState[] = [];
    for (const [nonce, state] of this.sessions) {
      if (now < state.expiresAt) {
        active.push(state);
      } else {
        this.sessions.delete(nonce);
      }
    }
    return active;
  }

  getCookieValue(nonce: string): string {
    return `${PREVIEW_COOKIE_NAME}=${nonce}; Path=/; Max-Age=3600; SameSite=Lax`;
  }

  resolvePreviewOverrides(
    activeThemeSlug: string,
    cookieValue: string | null,
  ): string {
    if (!cookieValue) return activeThemeSlug;

    const previewTheme = this.getPreviewTheme(cookieValue);
    return previewTheme ?? activeThemeSlug;
  }

  async isThemeInstalled(themeSlug: string): Promise<boolean> {
    const theme = await this.prisma.theme.findUnique({ where: { slug: themeSlug } });
    return theme !== null;
  }

  async resolveThemeWithPreview(
    activeThemeSlug: string,
    cookieValue: string | null,
  ): Promise<string> {
    if (!cookieValue) return activeThemeSlug;

    const previewTheme = this.getPreviewTheme(cookieValue);
    if (!previewTheme) return activeThemeSlug;

    const installed = await this.isThemeInstalled(previewTheme);
    return installed ? previewTheme : activeThemeSlug;
  }

  private generateNonce(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    for (let i = 0; i < 32; i++) {
      result += chars[(array[i] ?? 0) % chars.length];
    }
    return result;
  }
}

export function parsePreviewCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");
    if (name === PREVIEW_COOKIE_NAME && value) {
      return value;
    }
  }
  return null;
}
