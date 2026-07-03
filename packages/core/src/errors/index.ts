/**
 * Error system for NodePress.
 * Provides error levels, deprecation warnings, and error suppression.
 */

export {
  LeveledError,
  WarningError,
  DeprecationError,
  StrictModeError,
  NoticeError,
  deprecate,
  triggerDeprecationWarning,
  resetDeprecationCache,
  suppressErrors,
  isDebugMode,
} from "./error-levels.js";

export type { ErrorLevel, ErrorLevelOptions, DeprecationWarningOptions } from "./error-levels.js";
