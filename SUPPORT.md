# 🆘 Support

## Getting Help

There are several ways to get help with NodePress:

---

## 📚 Documentation (Read First)

Before asking for help, check these resources — your question is likely answered:

| Resource                                    | Description                      |
| ------------------------------------------- | -------------------------------- |
| 📖 [README.md](README.md)                   | Project overview and quick start |
| 🚀 [GETTING-STARTED.md](GETTING-STARTED.md) | Step-by-step installation guide  |
| ⚡ [QUICK-START.md](QUICK-START.md)         | Developer reference              |
| ❓ [docs/FAQ.md](docs/FAQ.md)               | Frequently asked questions       |
| 📘 [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | Complete user manual             |
| 🔄 [UPGRADE.md](UPGRADE.md)                 | Upgrade instructions             |
| 🔒 [SECURITY.md](SECURITY.md)               | Security policies                |
| 🤝 [CONTRIBUTING.md](CONTRIBUTING.md)       | How to contribute                |

---

## 💬 Community

| Channel                   | Purpose                        | Where to Go                                          |
| ------------------------- | ------------------------------ | ---------------------------------------------------- |
| 🐛 **GitHub Issues**      | Bug reports & feature requests | https://github.com/superdevids/nodepress/issues      |
| 💡 **GitHub Discussions** | Questions, ideas, show & tell  | https://github.com/superdevids/nodepress/discussions |
| 🗨️ **Discord**            | Real-time chat & community     | _(Coming soon)_                                      |
| 📚 **Stack Overflow**     | Tag questions with `nodepress` | https://stackoverflow.com/questions/tagged/nodepress |

### Before Creating an Issue

1. ✅ Check the documentation for your question
2. ✅ Search existing (open and closed) issues
3. ✅ Search Stack Overflow for similar problems
4. ✅ Make sure you're running the latest version
5. ✅ Try the troubleshooting steps below

### Good First Issues

Looking to contribute? Check the [`good first issue` label](https://github.com/superdevids/nodepress/labels/good%20first%20issue) for beginner-friendly tasks.

---

## 🐛 Filing a Bug Report

When filing a bug, please include:

```
- NodePress version: [e.g., 1.0.0-beta.2]
- Node.js version: [e.g., v20.12.0]
- Operating system: [e.g., Windows 11, macOS 14, Ubuntu 22.04]
- Browser (if applicable): [e.g., Chrome 125, Firefox 128]
- Docker version (if applicable): [e.g., Docker Desktop 4.30]
- Database: [PostgreSQL 16]
- Steps to reproduce:
  1. ...
  2. ...
  3. ...
- Expected behavior:
- Actual behavior:
- Relevant logs or error messages:
```

**Template:** https://github.com/superdevids/nodepress/issues/new?template=bug_report.md

---

## 💡 Feature Requests

Feature requests are welcome! Please:

1. **Check existing issues** — avoid duplicates
2. **Explain the problem** you're trying to solve (not just the solution)
3. **Describe the proposed solution**
4. **Consider alternatives**

**Template:** https://github.com/superdevids/nodepress/issues/new?template=feature_request.md

---

## 🔒 Security Issues

**Do NOT report security vulnerabilities publicly.**

For security vulnerabilities, please see [SECURITY.md](SECURITY.md) for our disclosure process.

---

## 🚨 Common Issues

### "npm install" fails

```bash
# Clear npm cache and retry
npm cache clean --force
npm install

# Check Node.js version
node -v   # Must be v20+
```

### "npm start" fails with port in use

```bash
# Find what's using the port
# Windows:
netstat -ano | findstr :3000

# Mac/Linux:
lsof -i :3000
```

### Docker doesn't work

- Install Docker Desktop from https://www.docker.com/products/docker-desktop/
- Or skip Docker entirely: `npm install && npm start`

### Login doesn't work

Default credentials: `admin@nodepress.local` / `admin`

If changed, use the CLI to reset: `npx nodepressjs user reset-password <email>`

---

## 📋 Issue Templates

- [🐛 Bug Report](https://github.com/superdevids/nodepress/issues/new?template=bug_report.md)
- [💡 Feature Request](https://github.com/superdevids/nodepress/issues/new?template=feature_request.md)
- [❓ Question](https://github.com/superdevids/nodepress/discussions/new?category=q-a)

---

## 🤝 Professional Support

For commercial support and consulting:

- Contact: **support@nodepress.dev**
- Or open a [GitHub Discussion](https://github.com/superdevids/nodepress/discussions)
