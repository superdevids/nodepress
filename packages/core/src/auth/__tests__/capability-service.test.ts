import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilityService } from '../capability-service.js';

describe('CapabilityService', () => {
  let capabilityService: CapabilityService;

  beforeEach(() => {
    capabilityService = new CapabilityService();
  });

  describe('default roles', () => {
    it('has SUPER_ADMIN role with wildcard capability', () => {
      expect(capabilityService.userCan('SUPER_ADMIN', 'anything:at:all')).toBe(true);
      expect(capabilityService.userCan('SUPER_ADMIN', '*')).toBe(true);
      expect(capabilityService.userCan('SUPER_ADMIN', 'content:post:create')).toBe(true);
    });

    it('has ADMIN role with all main resource capabilities', () => {
      expect(capabilityService.userCan('ADMIN', 'content:post:create')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'media:upload')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'users:list')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'settings:read')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'plugins:install')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'themes:switch')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'tools:import')).toBe(true);
    });

    it('has EDITOR role with content and media capabilities', () => {
      expect(capabilityService.userCan('EDITOR', 'content:post:create')).toBe(true);
      expect(capabilityService.userCan('EDITOR', 'content:publish')).toBe(true);
      expect(capabilityService.userCan('EDITOR', 'content:edit:others')).toBe(true);
      expect(capabilityService.userCan('EDITOR', 'content:delete:others')).toBe(true);
      expect(capabilityService.userCan('EDITOR', 'media:upload')).toBe(true);
      expect(capabilityService.userCan('EDITOR', 'media:edit')).toBe(true);
    });

    it('has AUTHOR role with own content and media upload capabilities', () => {
      expect(capabilityService.userCan('AUTHOR', 'content:create')).toBe(true);
      expect(capabilityService.userCan('AUTHOR', 'content:publish:own')).toBe(true);
      expect(capabilityService.userCan('AUTHOR', 'content:edit:own')).toBe(true);
      expect(capabilityService.userCan('AUTHOR', 'content:delete:own')).toBe(true);
      expect(capabilityService.userCan('AUTHOR', 'media:upload')).toBe(true);
    });

    it('has CONTRIBUTOR role with create and edit own content', () => {
      expect(capabilityService.userCan('CONTRIBUTOR', 'content:create')).toBe(true);
      expect(capabilityService.userCan('CONTRIBUTOR', 'content:edit:own')).toBe(true);
    });

    it('has SUBSCRIBER role with read capability only', () => {
      expect(capabilityService.userCan('SUBSCRIBER', 'content:read')).toBe(true);
    });

    it('SUBSCRIBER cannot create content', () => {
      expect(capabilityService.userCan('SUBSCRIBER', 'content:create')).toBe(false);
    });

    it('SUBSCRIBER cannot manage users', () => {
      expect(capabilityService.userCan('SUBSCRIBER', 'users:list')).toBe(false);
    });

    it('CONTRIBUTOR cannot publish content', () => {
      expect(capabilityService.userCan('CONTRIBUTOR', 'content:publish')).toBe(false);
    });

    it('AUTHOR cannot edit others content', () => {
      expect(capabilityService.userCan('AUTHOR', 'content:edit:others')).toBe(false);
    });

    it('EDITOR cannot manage users', () => {
      expect(capabilityService.userCan('EDITOR', 'users:list')).toBe(false);
    });

    it('ADMIN cannot access super admin wildcard', () => {
      // ADMIN has content:*, media:*, users:*, etc. but not "*"
      // A capability like "system:config:security" should not match
      expect(capabilityService.userCan('ADMIN', 'system:config:security')).toBe(false);
    });
  });

  describe('wildcard matching', () => {
    it('"*" matches any capability', () => {
      // SUPER_ADMIN has "*" wildcard
      expect(capabilityService.userCan('SUPER_ADMIN', 'anything')).toBe(true);
      expect(capabilityService.userCan('SUPER_ADMIN', 'a:b:c:d:e')).toBe(true);
      expect(capabilityService.userCan('SUPER_ADMIN', '')).toBe(true);
    });

    it('"content:*" matches all content sub-capabilities', () => {
      expect(capabilityService.userCan('ADMIN', 'content:post:create')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'content:page:delete')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'content:media:upload')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'content:anything')).toBe(true);
    });

    it('"media:*" matches all media sub-capabilities', () => {
      expect(capabilityService.userCan('ADMIN', 'media:upload')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'media:edit')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'media:delete')).toBe(true);
    });

    it('"users:*" matches all user sub-capabilities', () => {
      expect(capabilityService.userCan('ADMIN', 'users:create')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'users:edit')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'users:delete')).toBe(true);
      expect(capabilityService.userCan('ADMIN', 'users:promote')).toBe(true);
    });
  });

  describe('role hierarchy via inheritance', () => {
    it('returns false for unknown role', () => {
      expect(capabilityService.userCan('NONEXISTENT_ROLE', 'content:read')).toBe(false);
    });

    it('returns false for empty role string', () => {
      expect(capabilityService.userCan('', 'content:read')).toBe(false);
    });
  });

  describe('custom capability registration', () => {
    it('registers a new role with custom capabilities', () => {
      capabilityService.registerRole('VIP', {
        name: 'VIP User',
        capabilities: new Set(['content:read', 'content:create', 'media:upload', 'premium:access']),
      });

      expect(capabilityService.userCan('VIP', 'content:read')).toBe(true);
      expect(capabilityService.userCan('VIP', 'content:create')).toBe(true);
      expect(capabilityService.userCan('VIP', 'premium:access')).toBe(true);
    });

    it('registered role cannot use unassigned capabilities', () => {
      capabilityService.registerRole('VIP', {
        name: 'VIP User',
        capabilities: new Set(['content:read', 'content:create']),
      });

      expect(capabilityService.userCan('VIP', 'users:list')).toBe(false);
    });

    it('overwrites existing role when registering with same name', () => {
      capabilityService.registerRole('EDITOR', {
        name: 'Restricted Editor',
        capabilities: new Set(['content:read']),
      });

      expect(capabilityService.userCan('EDITOR', 'content:read')).toBe(true);
      expect(capabilityService.userCan('EDITOR', 'content:create')).toBe(false);
      expect(capabilityService.userCan('EDITOR', 'content:publish')).toBe(false);
    });

    it('registers role with specific wildcard', () => {
      capabilityService.registerRole('MEDIA_MANAGER', {
        name: 'Media Manager',
        capabilities: new Set(['media:*']),
      });

      expect(capabilityService.userCan('MEDIA_MANAGER', 'media:upload')).toBe(true);
      expect(capabilityService.userCan('MEDIA_MANAGER', 'media:delete:any')).toBe(true);
      expect(capabilityService.userCan('MEDIA_MANAGER', 'content:read')).toBe(false);
    });
  });

  describe('user-specific capabilities', () => {
    it('user-specific capabilities override role restrictions', () => {
      // SUBSCRIBER normally cannot create, but with user-specific capability they can
      expect(capabilityService.userCan('SUBSCRIBER', 'content:create', ['content:create'])).toBe(
        true,
      );
    });

    it('user-specific capabilities can grant additional access', () => {
      expect(capabilityService.userCan('SUBSCRIBER', 'settings:read', ['settings:read'])).toBe(
        true,
      );
    });

    it('user-specific wildcard capability grants all matching', () => {
      expect(capabilityService.userCan('SUBSCRIBER', 'content:post:delete', ['content:*'])).toBe(
        true,
      );
    });

    it('empty user capabilities do not affect role check', () => {
      expect(capabilityService.userCan('SUBSCRIBER', 'content:read', [])).toBe(true);
      expect(capabilityService.userCan('SUBSCRIBER', 'content:create', [])).toBe(false);
    });
  });

  describe('getRoles', () => {
    it('returns all registered roles', () => {
      const roles = capabilityService.getRoles();

      expect(roles.has('SUPER_ADMIN')).toBe(true);
      expect(roles.has('ADMIN')).toBe(true);
      expect(roles.has('EDITOR')).toBe(true);
      expect(roles.has('AUTHOR')).toBe(true);
      expect(roles.has('CONTRIBUTOR')).toBe(true);
      expect(roles.has('SUBSCRIBER')).toBe(true);
    });

    it('returns newly registered roles', () => {
      capabilityService.registerRole('CUSTOM', {
        name: 'Custom',
        capabilities: new Set(['custom:action']),
      });

      const roles = capabilityService.getRoles();
      expect(roles.has('CUSTOM')).toBe(true);
    });

    it('returns a copy, not the original map', () => {
      const roles = capabilityService.getRoles();
      roles.delete('SUPER_ADMIN');

      // Original should still have SUPER_ADMIN
      expect(capabilityService.getRoles().has('SUPER_ADMIN')).toBe(true);
    });

    it('displays role names correctly', () => {
      const roles = capabilityService.getRoles();

      expect(roles.get('SUPER_ADMIN')?.name).toBe('Super Admin');
      expect(roles.get('ADMIN')?.name).toBe('Admin');
      expect(roles.get('EDITOR')?.name).toBe('Editor');
      expect(roles.get('AUTHOR')?.name).toBe('Author');
      expect(roles.get('CONTRIBUTOR')?.name).toBe('Contributor');
      expect(roles.get('SUBSCRIBER')?.name).toBe('Subscriber');
    });
  });

  describe('pattern matching edge cases', () => {
    it('matches exact capability', () => {
      capabilityService.registerRole('TEST', {
        name: 'Test',
        capabilities: new Set(['exact:capability']),
      });

      expect(capabilityService.userCan('TEST', 'exact:capability')).toBe(true);
      expect(capabilityService.userCan('TEST', 'exact:capability:extra')).toBe(false);
    });

    it('pattern "a:*" should not match just "a"', () => {
      capabilityService.registerRole('TEST', {
        name: 'Test',
        capabilities: new Set(['a:*']),
      });

      expect(capabilityService.userCan('TEST', 'a')).toBe(false);
    });

    it('pattern "a:b" should not match "a:b:c"', () => {
      capabilityService.registerRole('TEST', {
        name: 'Test',
        capabilities: new Set(['a:b']),
      });

      expect(capabilityService.userCan('TEST', 'a:b:c')).toBe(false);
    });

    it('pattern with multiple colons', () => {
      capabilityService.registerRole('TEST', {
        name: 'Test',
        capabilities: new Set(['a:b:*']),
      });

      expect(capabilityService.userCan('TEST', 'a:b:c')).toBe(true);
      expect(capabilityService.userCan('TEST', 'a:b:c:d')).toBe(true);
      expect(capabilityService.userCan('TEST', 'a:c:c')).toBe(false);
    });
  });
});
