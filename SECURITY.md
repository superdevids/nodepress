# 🔒 Security Policy

> **NodePress is beta software.** We take security seriously and appreciate your help in keeping the project safe.

---

## ✅ Supported Versions

| Version    | Supported           |
| ---------- | ------------------- |
| 1.x (beta) | ✅ Security updates |
| < 1.0      | ❌ Not supported    |

Currently only the latest beta release receives security updates.

---

## 🐛 Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

### How to Report

Send an email to **security@nodepress.dev**

You should receive a response within **48 hours**. If you don't, please follow up to make sure we received your original message.

### What to Include

To help us respond quickly, please include:

```
- Type of vulnerability (e.g., SQL injection, XSS, CSRF, auth bypass)
- Affected component (API, Admin panel, Plugin, etc.)
- Full paths of source files related to the issue
- Steps to reproduce (minimal, concrete steps)
- Proof-of-concept or exploit code (if possible)
- Impact of the issue (what an attacker could do)
- Your preferred name for acknowledgment (optional)
```

### What We Commit To

1. ✅ **Acknowledge receipt** within 48 hours
2. ✅ **Provide an estimated timeline** for a fix
3. ✅ **Notify you** when the issue is resolved
4. ✅ **Credit you** in release notes (unless you prefer anonymity)

---

## 🔐 Disclosure Policy

We follow a **Coordinated Disclosure** process:

1. **Reporter** submits vulnerability report
2. **Our team** investigates and confirms the issue
3. **We develop and test** a fix
4. **We release** the fix and notify users
5. **Reporter** may publicly disclose after the fix is released

**Typical timeline:** 7-14 days from report to fix for critical issues.

---

## 🛡️ Security Features

NodePress includes these security features built-in (no plugins required):

| Feature                  | Status                                  |
| ------------------------ | --------------------------------------- |
| JWT Authentication       | ✅ Production-grade                     |
| Two-Factor Auth (TOTP)   | ✅ Built-in                             |
| CSP Headers              | ✅ Configurable                         |
| CORS Whitelist           | ✅ Configurable                         |
| Rate Limiting            | ✅ Redis-backed                         |
| SQL Injection Prevention | ✅ Prisma ORM (parameterized queries)   |
| XSS Prevention           | ✅ React auto-escaping                  |
| CSRF Protection          | ✅ SameSite cookies + origin validation |
| Audit Logging            | ✅ Built-in immutable log               |
| Password Hashing         | ✅ bcrypt                               |
| Security Keys            | ✅ Auto-generated at install            |
| Dependency Scanning      | ✅ npm audit + Dependabot               |

---

## 🏆 Recognition

We maintain a **Security Acknowledgments** page for researchers who help us improve NodePress security. With your permission, we'll add your name to our acknowledgments.

---

## 📚 Additional Resources

- [CONTRIBUTING.md](CONTRIBUTING.md) — Development guidelines
- [SUPPORT.md](SUPPORT.md) — Getting help
- [docs/FAQ.md](docs/FAQ.md) — Frequently asked questions
