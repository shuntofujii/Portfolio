import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const publicFiles = [
  'index.html',
  '404.html',
  'profile/index.html',
  'dates/index.html',
  'ejic/index.html',
  'izumo/index.html',
  'deteqle/index.html',
  'rockpaperdead/index.html',
  'sepila/index.html',
  'kujico/index.html',
  'others/index.html',
  'scripts/build-project-pages.mjs'
];

describe('GA4 タグの載せ方', () => {
  it('公開 HTML と生成テンプレートは defer の analytics.js で G-FD7TYG4S7P を読む', () => {
    for (const rel of publicFiles) {
      const source = fs.readFileSync(path.join(root, rel), 'utf8');
      const bodyAt = source.indexOf('<body');
      expect(bodyAt, rel).toBeGreaterThan(0);
      expect(source.slice(0, bodyAt), rel).not.toContain('G-FD7TYG4S7P');
      expect(source.slice(bodyAt), rel).toContain('data-ga-id="G-FD7TYG4S7P"');
      expect(source, rel).toContain(
        '<script type="module" defer src="/analytics.js" data-ga-id="G-FD7TYG4S7P"></script>'
      );
      expect(source, rel).not.toMatch(
        /<script(?![^>]*\bdefer\b)[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js/
      );
    }
  });

  it('load と requestIdleCallback の後に gtag/js?id=G-FD7TYG4S7P を挿入する', async () => {
    vi.resetModules();
    document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').forEach((el) => el.remove());
    window.dataLayer = [];
    delete window.gtag;

    let idle = null;
    window.requestIdleCallback = (cb) => {
      idle = cb;
      return 1;
    };

    await import('../analytics.js');

    if (document.readyState !== 'complete') {
      expect(document.querySelector('script[src*="gtag/js"]')).toBeNull();
      window.dispatchEvent(new Event('load'));
    }

    expect(typeof idle).toBe('function');
    expect(document.querySelector('script[src*="gtag/js"]')).toBeNull();
    idle();

    const script = document.querySelector('script[src*="gtag/js"]');
    expect(script).toBeTruthy();
    expect(script.getAttribute('src')).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-FD7TYG4S7P'
    );
    expect(script.async).toBe(true);

    const entries = window.dataLayer.map((entry) => Array.from(entry));
    expect(entries).toContainEqual(['config', 'G-FD7TYG4S7P', { send_page_view: false }]);
    const pageView = entries.find((entry) => entry[0] === 'event' && entry[1] === 'page_view');
    expect(pageView?.[2]).toEqual(
      expect.objectContaining({
        send_to: 'G-FD7TYG4S7P'
      })
    );
  });
});
