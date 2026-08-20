const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36';

const DEFAULT_TIMEOUT_MS = 20000;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export async function fetchHtml(url: string) {
  const timeout = withTimeout(DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: timeout.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch website. Status: ${response.status}`);
    }
    return response.text();
  } finally {
    timeout.clear();
  }
}

export async function fetchJson<T>(
  url: string,
  extraHeaders: Record<string, string> = {},
): Promise<T | undefined> {
  const timeout = withTimeout(DEFAULT_TIMEOUT_MS);
  try {
    let origin: string | undefined;
    try {
      origin = new URL(url).origin;
    } catch {
      origin = undefined;
    }

    const response = await fetch(url, {
      signal: timeout.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        ...(origin ? { Origin: origin } : {}),
        ...extraHeaders,
      },
    });
    if (!response.ok) return undefined;

    const contentType = response.headers?.get?.('content-type') ?? '';
    const text = await readResponseText(response);
    if (text == null) return undefined;
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    if (
      contentType.includes('text/html') ||
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<HTML')
    ) {
      return undefined;
    }
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
      return undefined;
    }
    return JSON.parse(trimmed) as T;
  } catch {
    return undefined;
  } finally {
    timeout.clear();
  }
}

async function readResponseText(response: Response): Promise<string | undefined> {
  if (typeof response.text === 'function') {
    try {
      return await response.text();
    } catch {
      // Fall through to json() for older/test mocks.
    }
  }
  if (typeof response.json === 'function') {
    try {
      return JSON.stringify(await response.json());
    } catch {
      return undefined;
    }
  }
  return undefined;
}
