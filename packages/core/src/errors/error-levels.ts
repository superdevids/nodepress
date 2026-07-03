/**
 * Error Levels & Deprecation System (Gap H-05).
 * Provides standardized error levels, deprecation warnings, and error suppression.
 */

export type ErrorLevel = "error" | "warning" | "deprecated" | "notice" | "strict";

export interface ErrorLevelOptions {
  level: ErrorLevel;
  message: string;
  code?: string;
  suggestion?: string;
  stackTrace?: boolean;
}

const DEBUG_MODE = () => process.env.NODEPRESS_DEBUG === "true" || process.env.NODE_ENV === "development";

const emittedDeprecations = new Set<string>();

export class LeveledError extends Error {
  public readonly level: ErrorLevel;
  public readonly code?: string;
  public readonly suggestion?: string;

  constructor(options: ErrorLevelOptions) {
    super(options.message);
    this.name = "LeveledError";
    this.level = options.level;
    this.code = options.code;
    this.suggestion = options.suggestion;

    if (options.stackTrace !== false) {
      Error.captureStackTrace(this, LeveledError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      level: this.level,
      code: this.code,
      message: this.message,
      suggestion: this.suggestion,
      stack: this.stack,
    };
  }
}

export class WarningError extends LeveledError {
  constructor(options: Omit<ErrorLevelOptions, "level">) {
    super({ ...options, level: "warning" });
    this.name = "WarningError";
  }
}

export class DeprecationError extends LeveledError {
  constructor(options: Omit<ErrorLevelOptions, "level">) {
    super({ ...options, level: "deprecated" });
    this.name = "DeprecationError";
  }
}

export class StrictModeError extends LeveledError {
  constructor(options: Omit<ErrorLevelOptions, "level">) {
    super({ ...options, level: "strict" });
    this.name = "StrictModeError";
  }
}

export class NoticeError extends LeveledError {
  constructor(options: Omit<ErrorLevelOptions, "level">) {
    super({ ...options, level: "notice" });
    this.name = "NoticeError";
  }
}

/**
 * Emit a deprecation warning.
 * Shows stack trace + suggestion in debug mode.
 */
export function deprecate(functionName: string, alternative: string, version: string): void {
  const key = `${functionName}::${version}`;
  if (emittedDeprecations.has(key)) return;
  emittedDeprecations.add(key);

  const message = `"${functionName}" is deprecated since v${version}. Use "${alternative}" instead.`;

  if (DEBUG_MODE()) {
    const error = new DeprecationError({ message, suggestion: `Replace ${functionName}() with ${alternative}()`, stackTrace: true });
    console.warn(`[Deprecation] ${message}`);
    console.warn(`  Suggestion: ${error.suggestion}`);
    if (error.stack) {
      const lines = error.stack.split("\n").slice(2, 5).join("\n");
      console.warn(`  Trace:\n${lines}`);
    }
  } else {
    console.warn(`[Deprecation] ${message}`);
  }
}

export interface DeprecationWarningOptions {
  since: string;
  alternative?: string;
  removalVersion?: string;
  pluginSlug?: string;
}

/**
 * Trigger a structured deprecation warning.
 */
export function triggerDeprecationWarning(message: string, options: DeprecationWarningOptions): void {
  const key = `${message}::${options.since}`;
  if (emittedDeprecations.has(key)) return;
  emittedDeprecations.add(key);

  const prefix = options.pluginSlug ? `[Plugin: ${options.pluginSlug}]` : "[NodePress]";
  let text = `${prefix} ${message} (deprecated since ${options.since})`;

  if (options.alternative) {
    text += `. Use "${options.alternative}" instead.`;
  }
  if (options.removalVersion) {
    text += ` Will be removed in v${options.removalVersion}.`;
  }

  if (DEBUG_MODE()) {
    const err = new Error(text);
    const stackLines = err.stack?.split("\n").slice(2, 6).join("\n") ?? "";
    console.warn(`${text}\n  Trace:\n${stackLines}`);
  } else {
    console.warn(text);
  }
}

/**
 * Clear emitted deprecation cache (useful in tests).
 */
export function resetDeprecationCache(): void {
  emittedDeprecations.clear();
}

/**
 * Suppress errors of a specific level or all errors.
 * Returns undefined if an error was suppressed.
 */
export function suppressErrors<T>(fn: () => T, level?: ErrorLevel): T | undefined {
  try {
    return fn();
  } catch (err) {
    if (err instanceof LeveledError) {
      if (level && err.level !== level) {
        throw err;
      }
      if (DEBUG_MODE()) {
        console.warn(`[Suppressed ${err.level}] ${err.message}`);
        if (err.suggestion) console.warn(`  Suggestion: ${err.suggestion}`);
      }
      return undefined;
    }
    if (!level) {
      if (DEBUG_MODE()) {
        console.warn(`[Suppressed] ${err instanceof Error ? err.message : String(err)}`);
      }
      return undefined;
    }
    throw err;
  }
}

/**
 * Check if the environment should emit deprecation notices.
 */
export function isDebugMode(): boolean {
  return DEBUG_MODE();
}
