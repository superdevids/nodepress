import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseStructure,
  generateUrl,
  matchUrl,
  isValidTag,
  getDefaultStructures,
} from '../permalink-structure.js';
import type { PermalinkParts } from '../permalink-structure.js';
import { PermalinkManager, DEFAULT_SETTINGS } from '../permalink-manager.js';
import { PermalinkService } from '../permalink-service.js';

describe('parseStructure', () => {
  it('parses a simple pattern with %postname%', () => {
    const result = parseStructure('/%postname%/');

    expect(result.pattern).toBe('/%postname%/');
    expect(result.tags).toEqual(['%postname%']);
    expect(result.paramNames).toEqual(['postname']);
    expect(result.regex).toBeInstanceOf(RegExp);
  });

  it('parses day and name structure', () => {
    const result = parseStructure('/%year%/%monthnum%/%day%/%postname%/');

    expect(result.tags).toContain('%year%');
    expect(result.tags).toContain('%monthnum%');
    expect(result.tags).toContain('%day%');
    expect(result.tags).toContain('%postname%');
    expect(result.paramNames).toEqual(['year', 'monthnum', 'day', 'postname']);
  });

  it('parses category and name structure', () => {
    const result = parseStructure('/%category%/%postname%/');

    expect(result.tags).toContain('%category%');
    expect(result.tags).toContain('%postname%');
  });

  it('generates regex with named capture groups', () => {
    const result = parseStructure('/%year%/%postname%/');

    expect(result.regex.source).toContain('(?<year>\\d{4})');
    expect(result.regex.source).toContain('(?<postname>[^/]+)');
  });

  it('handles patterns with special regex characters', () => {
    const result = parseStructure('/archives/%post_id%');

    expect(result.regex).toBeInstanceOf(RegExp);
    // Should escape the dot if present
    expect(() => new RegExp(result.regex)).not.toThrow();
  });
});

describe('generateUrl', () => {
  const year = '2024';
  const monthnum = '06';
  const day = '15';
  const postname = 'hello-world';
  const post_id = '123';

  const baseParts: PermalinkParts = {
    year,
    monthnum,
    day,
    postname,
    post_id,
  };

  it('generates URL with %year%/%monthnum%/%day%/%postname%', () => {
    const structure = parseStructure('/%year%/%monthnum%/%day%/%postname%/');
    const url = generateUrl(structure, baseParts);

    expect(url).toBe('/2024/06/15/hello-world');
  });

  it('generates URL with %postname% only', () => {
    const structure = parseStructure('/%postname%/');
    const url = generateUrl(structure, baseParts);

    expect(url).toBe('/hello-world');
  });

  it('generates URL with %category%/%postname%', () => {
    const structure = parseStructure('/%category%/%postname%/');
    const url = generateUrl(structure, {
      ...baseParts,
      category: 'technology',
    });

    expect(url).toBe('/technology/hello-world');
  });

  it('uses "uncategorized" when category is not provided', () => {
    const structure = parseStructure('/%category%/%postname%/');
    const url = generateUrl(structure, baseParts);

    expect(url).toBe('/uncategorized/hello-world');
  });

  it('generates URL with %author%/%postname%', () => {
    const structure = parseStructure('/%author%/%postname%/');
    const url = generateUrl(structure, {
      ...baseParts,
      author: 'admin',
    });

    expect(url).toBe('/admin/hello-world');
  });

  it('uses "author" when author is not provided', () => {
    const structure = parseStructure('/%author%/%postname%/');
    const url = generateUrl(structure, baseParts);

    expect(url).toBe('/author/hello-world');
  });

  it('generates numeric URL with %post_id%', () => {
    const structure = parseStructure('/archives/%post_id%');
    const url = generateUrl(structure, baseParts);

    expect(url).toBe('/archives/123');
  });

  it('encodes special characters in postname', () => {
    const structure = parseStructure('/%postname%/');
    const url = generateUrl(structure, {
      ...baseParts,
      postname: 'hello world & more',
    });

    expect(url).toBe('/hello%20world%20%26%20more');
  });

  it('encodes special characters in category', () => {
    const structure = parseStructure('/%category%/%postname%/');
    const url = generateUrl(structure, {
      ...baseParts,
      category: 'tech news',
      postname: 'my-article',
    });

    expect(url).toBe('/tech%20news/my-article');
  });

  it('handles empty slug gracefully', () => {
    const structure = parseStructure('/%postname%/');
    const url = generateUrl(structure, {
      ...baseParts,
      postname: '',
    });

    expect(url).toBe('/');
  });

  it('normalizes multiple slashes', () => {
    const structure = parseStructure('/%year%//%postname%');
    const url = generateUrl(structure, baseParts);

    expect(url).toBe('/2024/hello-world');
  });

  it('uses default values for date parts when not provided', () => {
    const structure = parseStructure('/%year%/%monthnum%/%day%/%postname%/');
    const url = generateUrl(structure, { postname: 'test', post_id: '0' });

    // Should use current date values (not 1970)
    const now = new Date();
    expect(url).toContain(String(now.getFullYear()));
    expect(url).toContain(String(now.getMonth() + 1).padStart(2, '0'));
    expect(url).toContain(String(now.getDate()).padStart(2, '0'));
    expect(url).toContain('/test');
  });

  it('zero-pads monthnum to 2 digits', () => {
    const structure = parseStructure('/%year%/%monthnum%/%postname%/');
    const url = generateUrl(structure, { ...baseParts, monthnum: '3' });

    expect(url).toBe('/2024/03/hello-world');
  });

  it('zero-pads day to 2 digits', () => {
    const structure = parseStructure('/%year%/%monthnum%/%day%/%postname%/');
    const url = generateUrl(structure, { ...baseParts, day: '5' });

    expect(url).toBe('/2024/06/05/hello-world');
  });
});

describe('matchUrl', () => {
  it('matches a simple %postname% URL with trailing slash', () => {
    const structure = parseStructure('/%postname%/');
    const result = matchUrl(structure, '/hello-world/');

    expect(result).not.toBeNull();
    expect(result!.postname).toBe('hello-world');
  });

  it('matches a dated URL structure with trailing slash', () => {
    const structure = parseStructure('/%year%/%monthnum%/%day%/%postname%/');
    const result = matchUrl(structure, '/2024/06/15/my-article/');

    expect(result).not.toBeNull();
    expect(result!.year).toBe('2024');
    expect(result!.monthnum).toBe('06');
    expect(result!.day).toBe('15');
    expect(result!.postname).toBe('my-article');
  });

  it('matches category URL with trailing slash', () => {
    const structure = parseStructure('/%category%/%postname%/');
    const result = matchUrl(structure, '/tech/hello-world/');

    expect(result).not.toBeNull();
    expect(result!.category).toBe('tech');
    expect(result!.postname).toBe('hello-world');
  });

  it('returns null for non-matching URL', () => {
    const structure = parseStructure('/%postname%/');
    const result = matchUrl(structure, '/2024/06/15/hello-world');

    expect(result).toBeNull();
  });

  it('matches URL with trailing slash explicitly required by pattern', () => {
    const structure = parseStructure('/%postname%/');
    const result = matchUrl(structure, '/hello-world/');

    expect(result).not.toBeNull();
    expect(result!.postname).toBe('hello-world');
  });

  it('matches %postname% pattern without trailing slash in pattern', () => {
    const structure = parseStructure('/%postname%');
    const result = matchUrl(structure, '/hello-world');

    expect(result).not.toBeNull();
    expect(result!.postname).toBe('hello-world');
  });

  it('matches numeric post_id URL', () => {
    const structure = parseStructure('/archives/%post_id%');
    const result = matchUrl(structure, '/archives/123');

    expect(result).not.toBeNull();
    expect(result!.post_id).toBe('123');
  });

  it('returns null when URL does not match pattern', () => {
    const structure = parseStructure('/%year%/%postname%/');
    const result = matchUrl(structure, '/not-a-year/hello');

    expect(result).toBeNull();
  });
});

describe('isValidTag', () => {
  it('returns true for valid permalink tags', () => {
    expect(isValidTag('%year%')).toBe(true);
    expect(isValidTag('%monthnum%')).toBe(true);
    expect(isValidTag('%day%')).toBe(true);
    expect(isValidTag('%postname%')).toBe(true);
    expect(isValidTag('%post_id%')).toBe(true);
    expect(isValidTag('%category%')).toBe(true);
  });

  it('returns false for invalid tags', () => {
    expect(isValidTag('%invalid%')).toBe(false);
    expect(isValidTag('%year')).toBe(false);
    expect(isValidTag('year%')).toBe(false);
    expect(isValidTag('')).toBe(false);
    expect(isValidTag('%YEAR%')).toBe(false);
  });
});

describe('getDefaultStructures', () => {
  it('returns all default permalink structures', () => {
    const structures = getDefaultStructures();

    expect(structures.length).toBeGreaterThanOrEqual(6);
  });

  it('includes day and name structure', () => {
    const structures = getDefaultStructures();
    const dayAndName = structures.find((s) => s.label === 'Day and name');

    expect(dayAndName).toBeDefined();
    expect(dayAndName!.pattern).toBe('/%year%/%monthnum%/%day%/%postname%/');
  });

  it('includes post name structure', () => {
    const structures = getDefaultStructures();
    const postName = structures.find((s) => s.label === 'Post name');

    expect(postName).toBeDefined();
    expect(postName!.pattern).toBe('/%postname%/');
  });

  it('includes category and name structure', () => {
    const structures = getDefaultStructures();
    const catAndName = structures.find((s) => s.label === 'Category and name');

    expect(catAndName).toBeDefined();
    expect(catAndName!.pattern).toBe('/%category%/%postname%/');
  });
});

describe('PermalinkManager', () => {
  let manager: PermalinkManager;

  beforeEach(() => {
    manager = new PermalinkManager();
  });

  describe('default settings', () => {
    it('uses default structure', () => {
      const settings = manager.getSettings();
      expect(settings.structure).toBe(DEFAULT_SETTINGS.structure);
    });

    it('generates URL using default structure (year/month/postname)', () => {
      const url = manager.generate({
        year: '2024',
        monthnum: '06',
        postname: 'hello-world',
        post_id: '1',
      });

      expect(url).toBe('/2024/06/hello-world');
    });
  });

  describe('saveSettings', () => {
    it('updates the permalink structure', () => {
      manager.saveSettings({ structure: '/%postname%/' });
      expect(manager.getSettings().structure).toBe('/%postname%/');
    });

    it('generates URLs using the new structure', () => {
      manager.saveSettings({ structure: '/%category%/%postname%/' });

      const url = manager.generate({
        postname: 'my-article',
        post_id: '1',
        category: 'tech',
      });

      expect(url).toBe('/tech/my-article');
    });
  });

  describe('getParsedStructure', () => {
    it('returns parsed structure matching current settings', () => {
      manager.saveSettings({ structure: '/%year%/%postname%/' });

      const parsed = manager.getParsedStructure();
      expect(parsed.tags).toContain('%year%');
      expect(parsed.tags).toContain('%postname%');
    });
  });

  describe('match', () => {
    it('matches a URL against the current structure', () => {
      manager.saveSettings({ structure: '/%postname%/' });
      const result = manager.match('/my-post/');

      expect(result).not.toBeNull();
      expect(result!.postname).toBe('my-post');
    });

    it('returns null for non-matching URL', () => {
      manager.saveSettings({ structure: '/%postname%/' });
      const result = manager.match('/2024/my-post');

      expect(result).toBeNull();
    });
  });

  describe('generateCanonical', () => {
    it('generates same URL as generate', () => {
      const parts = { postname: 'test-article', post_id: '1' };
      expect(manager.generateCanonical(parts)).toBe(manager.generate(parts));
    });
  });

  describe('guessRedirect', () => {
    it('returns matched params from alternative structures', () => {
      // Set current structure to day+name
      manager.saveSettings({ structure: '/%year%/%monthnum%/%day%/%postname%/' });

      // Try matching a post-name-only URL (using alternative %postname% pattern)
      const result = manager.guessRedirect('/hello-world/');

      expect(result).not.toBeNull();
      expect(result!.postname).toBe('hello-world');
    });

    it('returns null when no alternative structure matches', () => {
      manager.saveSettings({ structure: '/%postname%/' });
      const result = manager.guessRedirect('/some/random/path/here');

      expect(result).toBeNull();
    });

    it('skips current structure when guessing', () => {
      manager.saveSettings({ structure: '/%postname%/' });
      const result = manager.guessRedirect('/2024/06/15/test/');

      // Should match day+name or year+month+name since those are different from current
      // We can't guarantee which, but it should match something
      expect(result).not.toBeNull();
    });
  });

  describe('getDefaults', () => {
    it('returns all default structure options', () => {
      const defaults = manager.getDefaults();
      expect(defaults.length).toBe(getDefaultStructures().length);
    });
  });
});

describe('PermalinkService', () => {
  it('wraps PermalinkManager', () => {
    const service = new PermalinkService();

    expect(service.manager).toBeDefined();
    expect(service.manager).toBeInstanceOf(PermalinkManager);
  });

  it('setStructure updates the manager pattern', () => {
    const service = new PermalinkService();

    service.setStructure('/%postname%/');

    const parsed = service.getStructure();
    expect(parsed.tags).toContain('%postname%');
    expect(parsed.tags).not.toContain('%year%');
  });

  it('generate uses the updated structure', () => {
    const service = new PermalinkService();

    service.setStructure('/%category%/%postname%/');
    const url = service.generate({ postname: 'my-article', post_id: '1', category: 'tech' });

    expect(url).toBe('/tech/my-article');
  });

  it('getDefaults returns available structures', () => {
    const defaults = PermalinkService.getDefaults();

    expect(defaults.length).toBeGreaterThanOrEqual(6);
  });
});
