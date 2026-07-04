import { Injectable, Logger } from '@nestjs/common';
import crypto from 'crypto';

export interface CspConfig {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  mediaSrc: string[];
  connectSrc: string[];
  frameAncestors: string[];
  baseUri: string[];
  formAction: string[];
  reportOnly: boolean;
  reportUri?: string;
  nonceEnabled: boolean;
  pluginOverrides: Record<string, Partial<CspDirectives>>;
}

export interface CspDirectives {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  mediaSrc: string[];
  connectSrc: string[];
  frameAncestors: string[];
  baseUri: string[];
  formAction: string[];
}

const DEFAULT_CSP_CONFIG: CspConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
  mediaSrc: ["'self'", 'https:'],
  connectSrc: ["'self'", 'https:'],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  reportOnly: false,
  nonceEnabled: true,
  pluginOverrides: {},
};

@Injectable()
export class CspService {
  private readonly logger = new Logger(CspService.name);
  private config: CspConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): CspConfig {
    return {
      ...DEFAULT_CSP_CONFIG,
      reportOnly: process.env.CSP_REPORT_ONLY === 'true',
      reportUri: process.env.CSP_REPORT_URI || '/api/csp-violation',
      nonceEnabled: process.env.CSP_NONCE !== 'false',
    };
  }

  getConfig(): CspConfig {
    return { ...this.config };
  }

  updatePluginOverride(pluginSlug: string, directives: Partial<CspDirectives>): void {
    this.config.pluginOverrides[pluginSlug] = directives;
    this.logger.log(`CSP override updated for plugin: ${pluginSlug}`);
  }

  removePluginOverride(pluginSlug: string): void {
    delete this.config.pluginOverrides[pluginSlug];
    this.logger.log(`CSP override removed for plugin: ${pluginSlug}`);
  }

  generatePolicy(nonce?: string): string {
    const directives = this.mergeDirectives();
    const parts: string[] = [];

    if (directives.defaultSrc.length > 0) {
      parts.push(`default-src ${directives.defaultSrc.join(' ')}`);
    }
    if (directives.scriptSrc.length > 0) {
      let src = `script-src ${directives.scriptSrc.join(' ')}`;
      if (nonce && this.config.nonceEnabled) {
        src += ` 'nonce-${nonce}'`;
      }
      parts.push(src);
    }
    if (directives.styleSrc.length > 0) {
      parts.push(`style-src ${directives.styleSrc.join(' ')}`);
    }
    if (directives.imgSrc.length > 0) {
      parts.push(`img-src ${directives.imgSrc.join(' ')}`);
    }
    if (directives.mediaSrc.length > 0) {
      parts.push(`media-src ${directives.mediaSrc.join(' ')}`);
    }
    if (directives.connectSrc.length > 0) {
      parts.push(`connect-src ${directives.connectSrc.join(' ')}`);
    }
    if (directives.frameAncestors.length > 0) {
      parts.push(`frame-ancestors ${directives.frameAncestors.join(' ')}`);
    }
    if (directives.baseUri.length > 0) {
      parts.push(`base-uri ${directives.baseUri.join(' ')}`);
    }
    if (directives.formAction.length > 0) {
      parts.push(`form-action ${directives.formAction.join(' ')}`);
    }
    if (this.config.reportUri) {
      parts.push(`report-uri ${this.config.reportUri}`);
    }

    return parts.join('; ');
  }

  private mergeDirectives(): CspDirectives {
    const merged: CspDirectives = {
      defaultSrc: [...this.config.defaultSrc],
      scriptSrc: [...this.config.scriptSrc],
      styleSrc: [...this.config.styleSrc],
      imgSrc: [...this.config.imgSrc],
      mediaSrc: [...this.config.mediaSrc],
      connectSrc: [...this.config.connectSrc],
      frameAncestors: [...this.config.frameAncestors],
      baseUri: [...this.config.baseUri],
      formAction: [...this.config.formAction],
    };

    for (const override of Object.values(this.config.pluginOverrides)) {
      if (override.defaultSrc) merged.defaultSrc.push(...override.defaultSrc);
      if (override.scriptSrc) merged.scriptSrc.push(...override.scriptSrc);
      if (override.styleSrc) merged.styleSrc.push(...override.styleSrc);
      if (override.imgSrc) merged.imgSrc.push(...override.imgSrc);
      if (override.connectSrc) merged.connectSrc.push(...override.connectSrc);
    }

    return merged;
  }

  generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  getHeaderName(): string {
    return this.config.reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
  }
}
