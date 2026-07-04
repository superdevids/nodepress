# PRD v10: NodePress — Zero-Warning Installation & Dependency Hardening

**Version:** 10.0 | **Date:** July 4, 2026
**Status:** Final — All Issues Resolved
**Scope:** Eliminate ALL npm warnings, fix all installation errors, resolve security vulnerabilities

## 1. Executive Summary

The goal: `npm i` produces ZERO warnings. `npm start` produces ZERO errors. Installation must work like a traditional CMS: clone → npm i → npm start → CMS ready.

This PRD documents all issues found and their fixes.

## 2. Issue Analysis

### Issue 1: `.npmrc` Contains npm-Incompatible Directives (3 warnings)

- **File:** `.npmrc`
- **Before:** `link-workspace-packages=true`, `prefer-workspace-packages=true`, `share-workspace-lockfile=true`
- **Root Cause:** These are pnpm-specific configs. npm doesn't understand them and emits warnings.
- **Fix:** Removed all pnpm-specific configs. Replaced with `save-exact=true`, `fund=false`, `audit-level=high`.

### Issue 2: .npmrc Contains Registry Auth Token (1 warning)

- **Before:** `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`
- **Root Cause:** npm warns that env vars in committed .npmrc can leak secrets.
- **Fix:** Removed the authToken line. CI/CD should use its own auth config.

### Issue 3: start.js generateSecret() Missing Argument (HARD CRASH)

- **File:** `start.js:78`
- **Before:** `function generateSecret(length) { return crypto.randomBytes(length)... }`
- **Called as:** `generateSecret()` — without arguments
- **Error:** `TypeError: The "size" argument must be of type number. Received undefined`
- **Fix:** `function generateSecret(length = 48)` — default parameter

### Issue 4: Stray npm Lock File in pnpm Workspace

- **File:** `packages/editor/package-lock.json`
- **Problem:** npm lock file inside a pnpm-only workspace causes confusion
- **Fix:** Deleted the stray file

### Issue 5: Package Manager Auto-Install Was Invasive

- **Before:** start.js auto-installed pnpm globally if not found
- **Problem:** Unexpected side effects, permission issues
- **Fix:** Detect available package manager, don't auto-install

### Issue 6: Package Manager Detection Was Fragile

- **Before:** Only checked for lock files
- **Problem:** Lock files can exist without the package manager being installed
- **Fix:** Check for actual installation markers (node_modules directories)

## 3. Fix Applied

All fixes have been implemented and verified. See git commit `c8d2c03`.

## 4. Verification

- [x] `npm i` produces 0 warnings
- [x] `.npmrc` has no pnpm-specific configs
- [x] `.npmrc` has no auth token
- [x] `start.js generateSecret()` has default parameter
- [x] Stray lock file deleted
- [x] No invasive auto-install
- [x] PM detection is robust
- [x] Pushed to GitHub
