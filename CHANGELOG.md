# Changelog

All notable changes to NodePress are documented here.

---

## [1.0.0-beta.2] - 2026-07-04

### Added

- WordPress-style install flow: clone → `npm install` → `npm start`
- Windows `.bat` installer for one-click setup
- Zero-warning installation: all build/start errors resolved
- Auto-detection of missing prerequisites with download links

---

## [1.0.0-beta.1] - 2026-07-04

### Added

- Production-ready admin panel with full API integration
- Install Wizard (5-step setup: Database → Admin → Site → Plugins → Theme)
- Forgot Password & Reset Password flow
- Bulk Actions API (publish, unpublish, trash, delete)
- Notifications System with real-time bell icon
- Full WordPress-style template hierarchy (11 routes)
- Plugin Data Persistence (all 13 plugins survive restart via Prisma)
- 24 automated test files
- Dark mode support across admin and public theme
- SEO: sitemap.xml, robots.txt, JSON-LD structured data

### Fixed

- GraphQL authentication bypass (changePassword/profile protections)
- Plugin data loss on restart (in-memory → database persistence)
- JWT role case mismatch (lowercase → uppercase)
- Webhook event matching fix
- Session revokeAll no longer logs out current user
- Rate-limit path bypass (substring → exact match)
- Cross-platform compatibility (Windows backup fix)
- 8 empty admin panel onClick handlers wired up
- Hardcoded secrets, passwords, and DB URLs removed
- 44+ other bugs and security fixes

### Changed

- NodePress v0.0.1 → v1.0.0-beta.1
- Plugin SDK now exposes Prisma for persistent storage
- web-starter public theme rebuilt

### Removed

- Admin panel mock data (replaced with real API calls)
- Duplicate toast notification system (sonner)
- Custom dirname() function (replaced with path.dirname)

---

## [0.0.1] - 2026-06

### Added

- Initial release
- Core content management engine
- REST API + GraphQL API
- 13 plugins (basic versions)
- Docker development environment
- Plugin system with hooks/filters
- Admin panel (Next.js 14)
- Basic user authentication
- CLI tool with 30+ commands
