import puppeteer, { Browser } from 'puppeteer-core';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { getDb } from '../db/index.js';

export class BrowserEngine {
  private browsers: Map<string, Browser> = new Map();

  private async getSettingsValue(key: string): Promise<string> {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value || '';
  }

  async getOrCreate(agentId: string): Promise<Browser> {
    if (this.browsers.has(agentId)) {
      const browser = this.browsers.get(agentId)!;
      if (browser.isConnected()) return browser;
      this.browsers.delete(agentId);
    }

    const userDataDir = path.join(os.homedir(), '.openpaw', 'agents', agentId, 'chrome-profile');
    const headlessValue = await this.getSettingsValue('browser_headless');
    const finalHeadless = headlessValue === 'true' ? 'new' : (headlessValue === 'false' ? false : false);

    const executablePath = this.findChrome();

    const browser = await puppeteer.launch({
      executablePath,
      headless: finalHeadless as any,
      userDataDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.browsers.set(agentId, browser);
    return browser;
  }

  async navigate(agentId: string, url: string): Promise<string> {
    const browser = await this.getOrCreate(agentId);
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      const content = await page.evaluate(() => (document as any).body.innerText);
      return content;
    } finally {
      await page.close();
    }
  }

  async screenshot(agentId: string): Promise<Buffer> {
    const browser = await this.getOrCreate(agentId);
    const [page] = await browser.pages(); // Use existing page or new
    const targetPage = page || await browser.newPage();
    const buffer = await targetPage.screenshot({ type: 'png' });
    return Buffer.from(buffer);
  }

  async click(agentId: string, selector: string): Promise<void> {
    const browser = await this.getOrCreate(agentId);
    const [page] = await browser.pages();
    if (!page) throw new Error('No active page to click');
    await page.click(selector);
  }

  async type(agentId: string, selector: string, text: string): Promise<void> {
    const browser = await this.getOrCreate(agentId);
    const [page] = await browser.pages();
    if (!page) throw new Error('No active page to type');
    await page.type(selector, text);
  }

  async evaluate(agentId: string, script: string): Promise<any> {
    const browser = await this.getOrCreate(agentId);
    const [page] = await browser.pages();
    if (!page) throw new Error('No active page to evaluate');
    return await page.evaluate(script);
  }

  async close(agentId: string): Promise<void> {
    const browser = this.browsers.get(agentId);
    if (browser) {
      await browser.close();
      this.browsers.delete(agentId);
    }
  }

  private findChrome(): string {
    const platforms: Record<string, string[]> = {
      win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ],
      darwin: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      ],
      linux: [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser'
      ]
    };

    const paths = platforms[process.platform] || [];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error(`Chrome not found on ${process.platform}. Please install it or set browser_path in settings.`);
  }
}
