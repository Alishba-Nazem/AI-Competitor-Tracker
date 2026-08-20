import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let browser: Browser | undefined;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export type ReviewBrowserContext = BrowserContext;

export async function withReviewContext<T>(
  run: (context: BrowserContext) => Promise<T>,
): Promise<T> {
  const instance = await getBrowser();
  const context = await instance.newContext({
    userAgent: USER_AGENT,
    locale: 'en-PK',
    viewport: { width: 1400, height: 1200 },
  });
  try {
    return await run(context);
  } finally {
    await context.close();
  }
}

export async function withReviewPage<T>(
  url: string,
  run: (page: Page) => Promise<T>,
): Promise<T> {
  return withReviewContext(async (context) => {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return await run(page);
    } finally {
      await page.close();
    }
  });
}

export async function closeReviewBrowser() {
  if (browser) {
    await browser.close();
    browser = undefined;
  }
}
