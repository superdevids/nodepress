/**
 * Developer tools for NodePress.
 * Active only in debug mode.
 */

export {
  queryMonitor,
  installQueryMonitor,
  getQueryStats,
  getNplusOnePatterns,
  clearQueryHistory,
} from "./query-monitor.js";

export type { QueryRecord, QueryMonitorStats } from "./query-monitor.js";
