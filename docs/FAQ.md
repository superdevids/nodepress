# Frequently Asked Questions

## General

### What is NodePress?

NodePress is a modern, open-source Content Management System (CMS) built entirely in TypeScript. It's designed as a WordPress alternative for JavaScript/TypeScript development teams.

### Is NodePress a WordPress clone?

No. NodePress is inspired by WordPress's content model and plugin architecture, but built from scratch using modern technology (NestJS, Next.js, Prisma, PostgreSQL).

### Do I need to know coding to use NodePress?

No. Content editors can use the admin panel without any coding knowledge. Installation requires basic command line skills or Docker.

## Installation

### What are the system requirements?

- Node.js 20+ or Docker Desktop
- 4GB RAM minimum
- 10GB free disk space
- PostgreSQL 16
- Redis 7

### Can I install NodePress on shared hosting?

No. NodePress requires Node.js runtime and PostgreSQL, which are not available on most shared hosting plans.

### Is there a one-click installer?

The Docker installation is one command: `docker compose up -d`. Then the web-based Install Wizard guides you through setup.

## Usage

### How do I create content?

Go to Content → [Content Type] → Add New. Fill in the fields and publish.

### How do I change my password?

Click your avatar → Profile → Change Password.

### How do I reset a forgotten password?

Click "Forgot Password?" on the login page and enter your email.

### Can I have multiple users?

Yes. Go to Users → Add New to create additional users with different roles.

## Technical

### What database does NodePress use?

PostgreSQL 16 with Prisma ORM.

### Can I use MySQL?

No. NodePress is designed for PostgreSQL.

### Is there a REST API?

Yes. REST API at `/api/` with Swagger documentation at `/docs`.

### Is there GraphQL?

Yes. GraphQL API at `/graphql` with Apollo Sandbox.

### Can I create custom content types?

Yes. Developers can define custom content types in code, or admins can create them via the admin panel.

## Migration

### Can I migrate from WordPress?

Yes. Use Tools → Import in the admin panel to upload a WordPress WXR export file.

### Will my URLs break?

No. NodePress supports WordPress-style permalink structures.

## Support

### Where can I get help?

- GitHub Issues: https://github.com/superdevids/nodepress/issues
- GitHub Discussions: https://github.com/superdevids/nodepress/discussions
- Documentation: /docs/
