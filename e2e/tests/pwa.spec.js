import { expect, test } from '../support/fixtures.js';

test.describe('application installable', () => {
  test('le manifeste et ses icônes sont servis', async ({ page }) => {
    await page.goto('/welcome');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifest = await (await page.request.get(href)).json();
    expect(manifest).toMatchObject({ name: 'PocketMoney', display: 'standalone', start_url: '/' });
    expect(manifest.icons.map(icon => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    for (const icon of manifest.icons) {
      const response = await page.request.get(icon.src);
      expect(response.status(), icon.src).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
    }
  });

  test('le service worker est actif et ne garde aucune réponse API', async ({ page }) => {
    await page.goto('/welcome');
    const state = await page.evaluate(async () => (await navigator.serviceWorker.ready).active.state);
    expect(['activating', 'activated']).toContain(state);
    await page.reload();
    await page.waitForLoadState('networkidle');
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const requests = (await Promise.all(keys.map(async key => (await caches.open(key)).keys()))).flat();
      return requests.map(request => new URL(request.url).pathname);
    });
    expect(cached).toContain('/index.html');
    expect(cached.filter(path => path.startsWith('/api/'))).toEqual([]);
  });
});
