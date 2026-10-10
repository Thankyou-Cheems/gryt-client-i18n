import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = dirname(fileURLToPath(import.meta.url));
const root = join(workspace, 'gryt-client-822-evidence-work');
const out = join(workspace, 'public-822-evidence');
const require = createRequire(join(root, 'package.json'));
const { chromium, expect } = require('@playwright/test');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
assert.equal(head, '93b05af9d062a502110cb5dc686eebe37a48083f');
assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(), '');
mkdirSync(out, { recursive: true });
const report = { publicPr: 'https://github.com/Gryt-chat/client/pull/822', head, publicLocaleKeys: 506, browser: '', screenshots: [], cases: [], network: { mockedExternalRequests: 0 }, hardware: { getUserMedia: 0, getDisplayMedia: 0, enumerateDevices: 0 }, limitations: ['Web build and isolated mocked guest/harness only', 'No real media, call, native PTT, OS IME, or Electron launch acceptance', 'Initial partial migration; untranslated areas remain as documented at this public head'] };
const servers = [];
let browser;

async function startServer(mode, port) {
  const child = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), ...(mode === 'preview' ? ['preview'] : []), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'], windowsHide: true });
  servers.push(child);
  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite ${mode} exited ${child.exitCode}`);
    try { if ((await fetch(origin)).ok) return origin; } catch {}
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`Vite ${mode} did not answer`);
}

async function contextFor(origin, { preference = 'en', system = ['en-US'], blocked = false, width = 1200 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en-US', colorScheme: 'dark' });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    report.network.mockedExternalRequests++;
    if (url.host === '127.0.0.1:59999') return route.fulfill({ json: { name: 'User server 名称', description: 'User description', members: '2', joinPolicy: 'open', identityTiers: ['local'] }, headers: { 'access-control-allow-origin': '*' } });
    return route.fulfill({ status: 200, json: {}, headers: { 'access-control-allow-origin': '*' } });
  });
  await context.routeWebSocket('**/*', (socket) => { socket.onMessage(() => {}); });
  await context.addInitScript(({ preference, system, blocked }) => {
    Object.defineProperty(navigator, 'languages', { configurable: true, value: system });
    window.__fixtureMediaCalls = { getUserMedia: 0, getDisplayMedia: 0, enumerateDevices: 0 };
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => { window.__fixtureMediaCalls.getUserMedia++; throw new DOMException('Isolated evidence fixture', 'NotAllowedError'); };
      navigator.mediaDevices.getDisplayMedia = async () => { window.__fixtureMediaCalls.getDisplayMedia++; throw new DOMException('Isolated evidence fixture', 'NotAllowedError'); };
      navigator.mediaDevices.enumerateDevices = async () => { window.__fixtureMediaCalls.enumerateDevices++; return []; };
    }
    localStorage.setItem('gryt.deviceId', 'device:pr822-evidence');
    localStorage.setItem('user:device:pr822-evidence:nickname', JSON.stringify('Reviewer guest'));
    localStorage.setItem('fixture.identity', 'unchanged-fixture');
    if (preference !== null && localStorage.getItem('gryt.ui.language') === null) localStorage.setItem('gryt.ui.language', preference);
    if (blocked) {
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) { if (key === 'gryt.ui.language') throw new Error('blocked fixture'); return write.call(this, key, value); };
    }
  }, { preference, system, blocked });
  return context;
}

async function snap(page, name, caption, surface) {
  await page.screenshot({ path: join(out, name), fullPage: false, animations: 'disabled' });
  report.screenshots.push({ file: name, caption, surface, viewport: page.viewportSize(), sha256: createHash('sha256').update(readFileSync(join(out, name))).digest('hex') });
}

async function openLanguage(page, language) {
  const en = language === 'en';
  await page.getByRole('button', { name: en ? 'Settings and account' : '设置与账号', exact: true }).click();
  await page.getByRole('menuitem', { name: en ? 'Settings' : '设置', exact: true }).click();
  const search = page.getByPlaceholder(en ? 'Search settings' : '搜索设置');
  await search.fill(en ? 'Language' : '语言');
  await page.locator('.gryt-settings-result').filter({ hasText: en ? 'Language' : '语言' }).first().click();
  await expect(page.locator('[data-setting="language"]')).toBeVisible();
  await expect(page.getByRole('combobox', { name: en ? 'Language' : '语言', exact: true })).toBeVisible();
  await page.waitForTimeout(1600);
}

try {
  browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--renderer-process-limit=1'] });
  report.browser = browser.version();
  const production = await startServer('preview', 4797);
  const englishContext = await contextFor(production);
  const page = await englishContext.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(production);
  await expect(page.getByRole('heading', { name: 'Welcome to Gryt' })).toBeVisible({ timeout: 30_000 });
  await snap(page, 'en-welcome.png', 'English guest welcome, production Web build', 'production');
  await page.getByRole('button', { name: "I'll look myself" }).click();
  await openLanguage(page, 'en');
  await snap(page, 'en-language-settings.png', 'English Appearance / Display language selector, production Web build', 'production');
  await page.getByRole('combobox', { name: 'Language', exact: true }).click();
  await page.getByRole('option', { name: '简体中文', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('combobox', { name: '语言', exact: true })).toBeVisible();
  await page.waitForTimeout(300);
  await snap(page, 'zh-CN-language-settings.png', 'Same open production settings after using the real language selector', 'production');
  assert.equal(await page.evaluate(() => localStorage.getItem('gryt.ui.language')), 'zh-CN');
  assert.equal(await page.evaluate(() => localStorage.getItem('fixture.identity')), 'unchanged-fixture');
  report.cases.push({ name: 'production live selector', status: 'passed', observed: 'English -> Simplified Chinese; html.lang=zh-CN; stored preference=zh-CN; fixture identity unchanged' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await openLanguage(page, 'zh-CN');
  await expect(page.getByRole('combobox', { name: '语言', exact: true })).toContainText('简体中文');
  report.cases.push({ name: 'production reload persistence', status: 'passed', observed: 'Chinese selection persists after reload; same selector shows Simplified Chinese' });
  report.productionPageErrors = errors;
  assert.deepEqual(errors, []);
  const media = await page.evaluate(() => window.__fixtureMediaCalls);
  for (const [key, value] of Object.entries(media)) report.hardware[key] += value;
  await englishContext.close();

  const chineseContext = await contextFor(production, { preference: 'zh-CN' });
  const chinesePage = await chineseContext.newPage();
  await chinesePage.goto(production);
  await expect(chinesePage.getByRole('heading', { name: '欢迎使用 Gryt' })).toBeVisible({ timeout: 30_000 });
  await snap(chinesePage, 'zh-CN-welcome.png', 'Simplified Chinese guest welcome, same production Web build', 'production');
  await chineseContext.close();
  servers[0].kill();

  const development = await startServer('dev', 4798);
  const harnessContext = await contextFor(development, { preference: 'zh-CN' });
  const harness = await harnessContext.newPage();
  await harness.goto(`${development}/e2e/i18n-harness.html`);
  await harness.getByRole('button', { name: 'Open invite', exact: true }).click();
  await expect(harness.getByRole('heading', { name: '服务器邀请' })).toBeVisible();
  await harness.getByRole('button', { name: '接受邀请', exact: true }).click();
  await expect(harness.getByRole('alert')).toContainText('邀请码无效');
  await harness.waitForTimeout(1600);
  await snap(harness, 'zh-CN-open-invite.png', 'Public source harness: open invitation and retained local error in Chinese', 'public component harness');
  await harness.evaluate(() => { localStorage.setItem('gryt.ui.language', 'en'); window.dispatchEvent(new StorageEvent('storage', { key: 'gryt.ui.language' })); });
  await expect(harness.getByRole('heading', { name: 'Server Invite' })).toBeVisible();
  await expect(harness.getByRole('alert')).toContainText('Invalid invite code');
  await expect(harness.getByText('User server 名称')).toBeVisible();
  await harness.waitForTimeout(300);
  await snap(harness, 'en-open-invite.png', 'Same already-open public harness dialog after the storage event; user server name unchanged', 'public component harness');
  report.cases.push({ name: 'public open-dialog storage event', status: 'passed', observed: 'Dialog and retained error change Chinese -> English while user server name stays unchanged' });
  // A rejected invite changes its action to Join; reopen before the accept-key fixture.
  await harness.getByRole('button', { name: 'Close', exact: true }).click();
  await harness.getByRole('button', { name: 'Open invite', exact: true }).click();
  await expect(harness.getByRole('button', { name: 'Accept Invite', exact: true })).toBeVisible();
  await harness.evaluate(async () => {
    const { i18n, setLanguagePreference } = await import('/src/packages/i18n/index.ts');
    delete i18n.getResourceBundle('zh-CN', 'translation').invite.accept;
    await setLanguagePreference('zh-CN');
  });
  await expect(harness.getByRole('heading', { name: '服务器邀请' })).toBeVisible();
  await expect(harness.getByRole('button', { name: 'Accept Invite', exact: true })).toBeVisible();
  await snap(harness, 'zh-CN-missing-key-fallback.png', 'Controlled missing Chinese key in the public harness falls back to English Accept invite', 'public component harness; deliberate in-memory missing-key fixture');
  report.cases.push({ name: 'public runtime missing-key fallback fixture', status: 'passed', observed: 'Removing invite.accept only from the in-memory Chinese resource returns English Accept invite while the dialog title stays Chinese; source files unchanged' });
  await harnessContext.close();

  const fallbackContext = await contextFor(development, { preference: null, system: ['ja-JP'], blocked: true, width: 390 });
  const fallback = await fallbackContext.newPage();
  await fallback.goto(`${development}/e2e/i18n-harness.html`);
  await expect(fallback.locator('html')).toHaveAttribute('lang', 'en');
  await fallback.getByRole('combobox').click();
  await fallback.getByRole('option', { name: '简体中文', exact: true }).click();
  await expect(fallback.locator('html')).toHaveAttribute('lang', 'zh-CN');
  assert.equal(await fallback.evaluate(() => localStorage.getItem('gryt.ui.language')), null);
  await snap(fallback, 'zh-CN-blocked-storage-narrow.png', 'Narrow public harness: blocked storage still permits a session-only Chinese switch', 'public component harness; blocked-storage fixture');
  await fallback.reload();
  await expect(fallback.locator('html')).toHaveAttribute('lang', 'en');
  report.cases.push({ name: 'unsupported system and blocked storage fixture', status: 'passed', observed: 'Japanese system falls back to English; blocked-write Chinese selection works for the session; reload returns to system fallback' });
  await fallbackContext.close();
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(), '');
  report.cleanExactHeadSource = true;
  writeFileSync(join(out, 'evidence.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ head, screenshots: report.screenshots.length, cases: report.cases, cleanExactHeadSource: true }));
} finally {
  await browser?.close();
  for (const server of servers) if (server.exitCode === null) server.kill();
}
