import { chromium, Browser, Page } from "playwright";

interface Session {
  page: Page;
  createdAt: number;
  lastActivity: number;
  viewportWidth: number;
  viewportHeight: number;
}

const SESSION_TIMEOUT = 10 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 1000;

let browser: Browser | null = null;
const sessions = new Map<string, Session>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browser;
}

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastActivity > SESSION_TIMEOUT) {
        session.page.close().catch(() => {});
        sessions.delete(id);
      }
    }
    if (sessions.size === 0 && browser) {
      browser.close().catch(() => {});
      browser = null;
      if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }
    }
  }, CLEANUP_INTERVAL);
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function createSession(width = 1280, height = 720): Promise<{ sessionId: string; screenshot: string; title: string }> {
  const b = await getBrowser();
  startCleanup();
  const page = await b.newPage();
  await page.setViewportSize({ width, height });

  const sessionId = generateId();
  const now = Date.now();
  sessions.set(sessionId, {
    page,
    createdAt: now,
    lastActivity: now,
    viewportWidth: width,
    viewportHeight: height,
  });

  await page.goto("about:blank", { waitUntil: "domcontentloaded" });
  const screenshot = await page.screenshot({ type: "jpeg", quality: 70 });
  const title = await page.title();

  return {
    sessionId,
    screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    title: title || "空白页",
  };
}

export async function navigate(sessionId: string, url: string): Promise<{ screenshot: string; title: string } | { error: string }> {
  const session = sessions.get(sessionId);
  if (!session) return { error: "会话不存在或已过期" };

  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  session.lastActivity = Date.now();
  await session.page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  const screenshot = await session.page.screenshot({ type: "jpeg", quality: 70 });
  const title = await session.page.title();

  return {
    screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    title: title || targetUrl,
  };
}

export async function clickAt(sessionId: string, x: number, y: number): Promise<{ screenshot: string; title: string } | { error: string }> {
  const session = sessions.get(sessionId);
  if (!session) return { error: "会话不存在或已过期" };

  session.lastActivity = Date.now();
  await session.page.mouse.click(x, y);
  await session.page.waitForTimeout(500);
  const screenshot = await session.page.screenshot({ type: "jpeg", quality: 70 });
  const title = await session.page.title();

  return {
    screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    title: title || "",
  };
}

export async function scrollBy(sessionId: string, deltaY: number): Promise<{ screenshot: string; title: string } | { error: string }> {
  const session = sessions.get(sessionId);
  if (!session) return { error: "会话不存在或已过期" };

  session.lastActivity = Date.now();
  await session.page.mouse.wheel(0, deltaY);
  await session.page.waitForTimeout(300);
  const screenshot = await session.page.screenshot({ type: "jpeg", quality: 70 });
  const title = await session.page.title();

  return {
    screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    title: title || "",
  };
}

export async function typeText(sessionId: string, text: string): Promise<{ screenshot: string; title: string } | { error: string }> {
  const session = sessions.get(sessionId);
  if (!session) return { error: "会话不存在或已过期" };

  session.lastActivity = Date.now();
  await session.page.keyboard.type(text);
  await session.page.waitForTimeout(300);
  const screenshot = await session.page.screenshot({ type: "jpeg", quality: 70 });
  const title = await session.page.title();

  return {
    screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    title: title || "",
  };
}

export async function pressKey(sessionId: string, key: string): Promise<{ screenshot: string; title: string } | { error: string }> {
  const session = sessions.get(sessionId);
  if (!session) return { error: "会话不存在或已过期" };

  session.lastActivity = Date.now();
  await session.page.keyboard.press(key);
  await session.page.waitForTimeout(300);
  const screenshot = await session.page.screenshot({ type: "jpeg", quality: 70 });
  const title = await session.page.title();

  return {
    screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    title: title || "",
  };
}

export async function goBack(sessionId: string): Promise<{ screenshot: string; title: string } | { error: string }> {
  const session = sessions.get(sessionId);
  if (!session) return { error: "会话不存在或已过期" };

  session.lastActivity = Date.now();
  await session.page.goBack({ timeout: 15000 }).catch(() => {});
  await session.page.waitForTimeout(500);
  const screenshot = await session.page.screenshot({ type: "jpeg", quality: 70 });
  const title = await session.page.title();

  return {
    screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    title: title || "",
  };
}

export async function goForward(sessionId: string): Promise<{ screenshot: string; title: string } | { error: string }> {
  const session = sessions.get(sessionId);
  if (!session) return { error: "会话不存在或已过期" };

  session.lastActivity = Date.now();
  await session.page.goForward({ timeout: 15000 }).catch(() => {});
  await session.page.waitForTimeout(500);
  const screenshot = await session.page.screenshot({ type: "jpeg", quality: 70 });
  const title = await session.page.title();

  return {
    screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    title: title || "",
  };
}

export async function refresh(sessionId: string): Promise<{ screenshot: string; title: string } | { error: string }> {
  const session = sessions.get(sessionId);
  if (!session) return { error: "会话不存在或已过期" };

  session.lastActivity = Date.now();
  await session.page.reload({ timeout: 30000 }).catch(() => {});
  await session.page.waitForTimeout(500);
  const screenshot = await session.page.screenshot({ type: "jpeg", quality: 70 });
  const title = await session.page.title();

  return {
    screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    title: title || "",
  };
}

export async function closeSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  await session.page.close().catch(() => {});
  sessions.delete(sessionId);
  if (sessions.size === 0 && browser) {
    await browser.close().catch(() => {});
    browser = null;
    if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }
  }
}
