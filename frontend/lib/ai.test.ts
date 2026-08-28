import { describe, expect, it } from "vitest";
import {
  formatCapturedFacts,
  lastUserText,
  parseChatMessages,
  publicChatError,
  suggestedChatPrompts,
} from "@/lib/ai";
import type { IntelligenceDashboard } from "@/lib/types";

const sampleDashboard: IntelligenceDashboard = {
  profile: {
    id: 1,
    businessName: "Ayan Bags",
    category: "Women bags",
    country: "Pakistan",
    storeUrl: null,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  summary: {
    competitorCount: 2,
    productCount: 12,
    capturedProductCount: 8,
    reviewCount: 40,
    findingCount: 1,
  },
  findings: [
    {
      kind: "PRICE_DECREASE",
      title: "Ayan Mall cut Tote Bag price",
      detail: "Tote Bag moved from PKR 2400 to PKR 2050.",
      competitorId: 10,
    },
  ],
  market: {
    enoughData: true,
    reviewCount: 40,
    competitorCount: 2,
    capturedProductCount: 8,
    priceBand: { min: 1450, max: 4200, median: 2350, currency: "PKR", sampleSize: 8 },
    sentiment: {
      rated: 20,
      unrated: 20,
      positive: 12,
      neutral: 3,
      negative: 5,
      positivePercent: 60,
      negativePercent: 25,
      averageRating: 3.8,
      ratingDistribution: { "1": 2, "2": 3, "3": 3, "4": 5, "5": 7 },
    },
    likes: [{ theme: "design", count: 9 }],
    complaints: [{ theme: "straps", count: 5 }],
    repeatedNeeds: [],
    opportunities: [],
  },
};

describe("parseChatMessages", () => {
  it("keeps the last turns of a multi-turn conversation", () => {
    const parsed = parseChatMessages([
      { id: "1", role: "user", parts: [{ type: "text", text: "Which competitor changed price recently?" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "Ayan Mall cut a tote." }] },
      { id: "3", role: "user", parts: [{ type: "text", text: "How significant is that change?" }] },
    ]);
    expect(parsed).toHaveLength(3);
    expect(lastUserText(parsed ?? [])).toBe("How significant is that change?");
  });

  it("rejects a payload that is not a conversation array", () => {
    expect(parseChatMessages({ text: "hello" })).toBeNull();
  });
});

describe("formatCapturedFacts", () => {
  it("includes stored prices, competitor names, and findings without inventing extra competitors", () => {
    const facts = formatCapturedFacts(sampleDashboard, [
      { name: "ABC Shoes", url: "https://abcshoes.example", platform: "SHOPIFY", isActive: true },
    ]);
    expect(facts).toContain("Ayan Bags");
    expect(facts).toContain("ABC Shoes");
    expect(facts).toContain("https://abcshoes.example");
    expect(facts).toContain("PKR 2400 to PKR 2050");
    expect(facts).not.toContain("invent");
  });

  it("says captured facts are unavailable instead of filling mock data", () => {
    expect(formatCapturedFacts(null)).toMatch(/unavailable/);
  });
});

describe("publicChatError", () => {
  it("hides quota and key details from the user", () => {
    expect(publicChatError(new Error("You exceeded your current quota, billing"))).toMatch(/Too many requests/);
    expect(publicChatError(new Error("You exceeded your current quota, billing"))).not.toContain("billing");
    expect(publicChatError(new Error("API_KEY_INVALID: secret-google-key"))).not.toContain("secret-google-key");
    expect(
      publicChatError(
        new Error(
          '{"error":"Gemini is not configured on the server. Add GOOGLE_GENERATIVE_AI_API_KEY to the frontend environment (not NEXT_PUBLIC_) and restart."}',
        ),
      ),
    ).toMatch(/not configured/);
    expect(publicChatError(new Error("RESOURCE_EXHAUSTED: You exceeded your current quota"))).toMatch(
      /Too many requests/,
    );
    expect(publicChatError(new Error("RESOURCE_EXHAUSTED: You exceeded your current quota"))).not.toContain(
      "RESOURCE_EXHAUSTED",
    );
    expect(publicChatError(new Error("HTTP_429"))).toMatch(/wait a moment/);
    expect(publicChatError(new Error("HTTP_500"))).toMatch(/temporarily unavailable/);
    expect(publicChatError(new Error("NETWORK_FAILURE"))).toMatch(/internet connection/);
    expect(publicChatError(new Error("MIDSTREAM_FAILURE"))).toMatch(/could not be completed/);
  });
});

describe("suggestedChatPrompts", () => {
  it("grounds the first prompt in a captured price change when one exists", () => {
    expect(suggestedChatPrompts(sampleDashboard)[0]).toContain("Ayan Mall cut Tote Bag price");
  });
});
