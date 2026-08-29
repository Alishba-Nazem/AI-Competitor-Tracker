import { expect, test, type Page, type Route } from "@playwright/test";

const ASSISTANT_REPLY = "Ayan Mall cut the tote bag from PKR 2,400 to PKR 2,050.";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

function uiMessageStream(text: string) {
  const frames = [
    { type: "start" },
    { type: "text-start", id: "analyst-text" },
    { type: "text-delta", id: "analyst-text", delta: text },
    { type: "text-end", id: "analyst-text" },
    { type: "finish" },
  ];
  return `${frames.map((frame) => `data: ${JSON.stringify(frame)}`).join("\n\n")}\n\ndata: [DONE]\n\n`;
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS });
    return;
  }
  await route.fulfill({
    status,
    headers: { ...CORS, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function mockExternalApis(page: Page) {
  await page.route(/https?:\/\/(localhost|127\.0\.0\.1):3000\/.*/, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/me") {
      await fulfillJson(route, { id: 1, name: "Ayan", email: "seller@store.com" });
      return;
    }
    if (path === "/onboarding/status") {
      await fulfillJson(route, { completed: true, profile: null });
      return;
    }
    if (path === "/intelligence/dashboard") {
      await fulfillJson(route, {
        profile: null,
        summary: {
          competitorCount: 1,
          productCount: 12,
          capturedProductCount: 8,
          reviewCount: 0,
          findingCount: 0,
        },
        findings: [],
        market: null,
      });
      return;
    }
    await fulfillJson(route, {});
  });

  await page.route("**/api/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "x-vercel-ai-ui-message-stream": "v1",
        "cache-control": "no-cache",
      },
      body: uiMessageStream(ASSISTANT_REPLY),
    });
  });
}

test("seller asks the AI Analyst a question and sees a mocked reply", async ({ page }) => {
  await mockExternalApis(page);
  await page.addInitScript(() => {
    const header = btoa(JSON.stringify({ alg: "none" })).replace(/=+$/, "");
    const payload = btoa(JSON.stringify({ sub: "1" })).replace(/=+$/, "");
    localStorage.setItem("ect_auth_token", `${header}.${payload}.`);
    localStorage.setItem("ect_auth_user_id", "1");
    sessionStorage.setItem("act_onboarding_completed_1", "1");
  });

  await page.goto("/ai-assistant");

  await expect(page.getByRole("heading", { name: "AI Competitor Analyst" })).toBeVisible({
    timeout: 15_000,
  });
  const composer = page.getByLabel("Message the AI Competitor Analyst");
  await composer.fill("Which competitor changed price recently?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Which competitor changed price recently?")).toBeVisible();
  await expect(page.getByText(ASSISTANT_REPLY)).toBeVisible();
});
