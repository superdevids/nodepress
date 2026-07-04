# NodePress User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Creating Content](#creating-content)
4. [Managing Media](#managing-media)
5. [Managing Users](#managing-users)
6. [Plugins](#plugins)
7. [Settings](#settings)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### First Time Setup

1. Open your browser and navigate to your NodePress URL
2. The Install Wizard will guide you through 5 steps:
   - Step 1: Database Configuration
   - Step 2: Create Admin Account
   - Step 3: Site Settings
   - Step 4: Select Plugins
   - Step 5: Choose Theme
3. After installation, log in with your admin credentials

### Login

- Navigate to `/admin/login`
- Enter your email and password
- Click "Log In"

### Forgot Password?

- Click "Forgot Password?" on the login page
- Enter your email address
- Check your inbox for a reset link
- Click the link and enter your new password

## Dashboard

The dashboard shows:

- At a Glance: Total posts, pages, comments, users
- Activity: Recent content changes
- Quick Draft: Create a quick post draft
- Recent Comments: Latest comments pending review

## Creating Content

### Posts

1. Go to Content → Posts
2. Click "Add New"
3. Enter your title and content
4. Set categories and tags
5. Choose featured image
6. Set publish status (Draft, Pending Review, Published)
7. Click "Publish" or "Save Draft"

### Pages

Similar to posts but without categories/tags.

### Custom Content Types

If enabled by your developer, custom types appear in the Content menu.

## Managing Media

1. Go to Media
2. Upload files by clicking "Upload" or dragging files
3. Click any media item to edit: alt text, caption, title, description
4. Delete media by clicking the trash icon

## Managing Users

1. Go to Users
2. View all users in the system
3. Click "Add New" to create a user
4. Edit user details: name, email, role, password
5. Delete users (cannot delete yourself)

### User Roles

| Role        | Permissions                    |
| ----------- | ------------------------------ |
| Super Admin | Full access to everything      |
| Admin       | Manage all content and users   |
| Editor      | Manage and publish all content |
| Author      | Create and publish own content |
| Contributor | Create drafts only             |
| Subscriber  | Read only, manage own profile  |

## Plugins

1. Go to Plugins
2. View all installed plugins
3. Toggle Activate/Deactivate
4. Configure plugin settings via Settings menu

### Official Plugins

- SEO - Meta tags, sitemap, schema.org
- Cache-Redis - Redis caching
- Comments - Gravatar, moderation, anti-spam
- Forms - Drag-and-drop form builder
- Analytics - Google Analytics integration
- Security - Firewall, 2FA, audit logging
- Social Sharing - Share buttons
- Backup - Scheduled backups
- Newsletter - Email campaigns
- Redirection - 301/302 redirects
- Performance - Page cache, minification
- Multilingual - 11 language support
- File Editor - Code editor

## Settings

### General

- Site title, tagline, URL
- Language and timezone
- Admin email

### Reading

- Front page displays
- Posts per page
- Search visibility

### Permalinks

- URL structure (Day/name, Post name, Custom)
- Optional category base

### SEO

- Meta title format
- Default meta description
- Open Graph defaults
- XML sitemap settings

### Security

- CORS origins
- CSP settings
- Rate limiting

## Troubleshooting

### Cannot log in

- Click "Forgot Password?" to reset
- Contact your administrator
- Check that your account is active

### Page not found (404)

- Check the URL
- The content may have been deleted or unpublished

### Slow loading

- Enable Redis caching
- Optimize images before uploading
- Check your internet connection

### Error 500 (Server Error)

- Contact your administrator
- Check the server logs
- The issue is usually temporary
