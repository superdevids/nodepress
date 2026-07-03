import { describe, it, expect, beforeEach } from 'vitest';
import { ShortcodeEngine } from '../shortcode/shortcode-engine.js';

describe('ShortcodeEngine', () => {
  let engine: ShortcodeEngine;

  beforeEach(() => {
    engine = new ShortcodeEngine();
  });

  describe('register', () => {
    it('registers a shortcode handler', () => {
      const handler = async () => '<p>custom</p>';
      engine.register('custom', handler);
      expect(engine.has('custom')).toBe(true);
    });

    it('unregisters a shortcode handler', () => {
      const handler = async () => '<p>custom</p>';
      engine.register('custom', handler);
      engine.unregister('custom');
      expect(engine.has('custom')).toBe(false);
    });
  });

  describe('built-in shortcodes', () => {
    it('renders [gallery] shortcode', async () => {
      const result = await engine.parse('[gallery ids="1,2,3" columns="2"]');
      expect(result).toContain('wp-block-gallery');
      expect(result).toContain('columns-2');
      expect(result).toContain('data-id="1"');
      expect(result).toContain('data-id="2"');
      expect(result).toContain('data-id="3"');
    });

    it('renders [audio] shortcode', async () => {
      const result = await engine.parse('[audio src="track.mp3" loop="true"]');
      expect(result).toContain('<audio');
      expect(result).toContain('src="track.mp3"');
      expect(result).toContain(' loop');
    });

    it('renders [video] shortcode', async () => {
      const result = await engine.parse('[video src="movie.mp4" width="640" height="360"]');
      expect(result).toContain('<video');
      expect(result).toContain('src="movie.mp4"');
      expect(result).toContain('width="640"');
      expect(result).toContain('height="360"');
    });

    it('renders [caption] shortcode with wrapped content', async () => {
      const result = await engine.parse('[caption caption="My Caption"]Content here[/caption]');
      expect(result).toContain('<figure');
      expect(result).toContain('My Caption');
      expect(result).toContain('Content here');
    });

    it('renders [embed] shortcode', async () => {
      const result = await engine.parse('[embed url="https://example.com/video"]');
      expect(result).toContain('wp-block-embed');
      expect(result).toContain('https://example.com/video');
    });

    it('renders [playlist] shortcode', async () => {
      const result = await engine.parse('[playlist ids="1,2" type="audio"]');
      expect(result).toContain('wp-playlist');
      expect(result).toContain('data-id="1"');
      expect(result).toContain('data-id="2"');
    });
  });

  it('replaces multiple occurrences of the same shortcode', async () => {
    const result = await engine.parse(
      '[gallery ids="1"] text [gallery ids="2"] more [gallery ids="3"]',
    );
    const matches = result.match(/data-id="/g);
    expect(matches).toHaveLength(3);
  });

  it('passes unknown shortcodes through unchanged', async () => {
    const result = await engine.parse('[unknown attr="value"]content[/unknown]');
    expect(result).toBe('[unknown attr="value"]content[/unknown]');
  });

  it('strips shortcodes with strip()', () => {
    const result = engine.strip('Hello [gallery ids="1"] world');
    expect(result).toBe('Hello world');
  });

  it('returns all registered shortcodes', () => {
    const all = engine.getAll();
    expect(all.length).toBeGreaterThan(0);
    const tags = all.map((s) => s.tag);
    expect(tags).toContain('gallery');
    expect(tags).toContain('audio');
    expect(tags).toContain('video');
    expect(tags).toContain('caption');
    expect(tags).toContain('embed');
    expect(tags).toContain('playlist');
  });
});
