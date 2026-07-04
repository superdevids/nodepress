# Changelog

## [1.0.0-beta.1] - 2026-07-04

### Added

- Production-ready admin panel with full API integration
- Install Wizard (5-step setup UI: Database → Admin → Site → Plugins → Theme)
- Forgot Password & Reset Password flow with email verification
- Bulk Actions API (publish, unpublish, draft, trash, restore, delete)
- Notifications System with real-time bell icon and auto-triggers
- Full WordPress-style template hierarchy for web-starter (11 routes)
- Plugin Data Persistence (all 13 plugins survive restart via Prisma)
- 169 automated tests (Auth, Content, Users, Media, Core, Admin UI)
- Dark mode support across admin and public theme
- SEO: sitemap.xml, robots.txt, JSON-LD structured data

### Fixed

- GraphQL authentication bypass (changePassword/profile no longer @Public)
- Plugin data loss on every restart (in-memory → database persistence)
- JWT role case mismatch (lowercase → uppercase consistency)
- Webhook event matching (JSON array exact match → contains)
- Session revokeAll no longer logs out current user
- Rate-limit path bypass (substring → exact match)
- Cross-platform compatibility (backup now works on Windows)
- 8 empty admin panel onClick handlers wired up
- Dual API client layers consolidated
- Hardcoded secrets, passwords, and DB URLs removed
- 44+ other bugs and security fixes (see PRD5 + PRD6)

### Changed

- NodePress v0.0.1 → v1.0.0-beta.1
- Plugin SDK now exposes Prisma for persistent storage
- web-starter public theme completely rebuilt

### Removed

- All admin panel mock data (replaced with real API calls)
- Duplicate toast notification system (sonner)
- Custom dirname() function (replaced with path.dirname)
