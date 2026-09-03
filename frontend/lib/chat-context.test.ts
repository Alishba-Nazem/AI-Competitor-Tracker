import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCapturedChatContext } from "@/lib/chat-context";

describe("loadCapturedChatContext", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a dummy Authorization header when the tracker API is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));

    const context = await loadCapturedChatContext("Bearer totally-fake");

    expect(context.authorized).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a 401 from the tracker instead of starting a Gemini turn", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("unauthorized", { status: 401 }));

    const context = await loadCapturedChatContext("Bearer expired");

    expect(context.authorized).toBe(false);
  });

  it("keeps a verified session authorized when the dashboard is temporarily 500", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("boom", { status: 500 }));

    const context = await loadCapturedChatContext("Bearer valid-session");

    expect(context.authorized).toBe(true);
  });

  it("authorizes a signed-in user and loads captured facts", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            profile: { businessName: "Ayan Bags" },
            summary: {
              competitorCount: 1,
              productCount: 2,
              capturedProductCount: 2,
              reviewCount: 0,
              findingCount: 0,
            },
            findings: [],
            market: {
              enoughData: false,
              reviewCount: 0,
              competitorCount: 1,
              capturedProductCount: 2,
              priceBand: null,
              sentiment: null,
              likes: [],
              complaints: [],
              repeatedNeeds: [],
              opportunities: [],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ name: "Ayan Mall", url: "https://ayan.example", platform: "DARAZ", isActive: true }]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const context = await loadCapturedChatContext("Bearer valid-session");

    expect(context.authorized).toBe(true);
    expect(context.factsText).toContain("Ayan Mall");
  });
});
