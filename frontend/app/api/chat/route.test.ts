import { beforeEach, describe, expect, it, vi } from "vitest";

const streamText = vi.fn();
const convertToModelMessages = vi.fn((messages: unknown) => messages);

vi.mock("ai", () => ({
  streamText: (options: unknown) => streamText(options),
  convertToModelMessages: (messages: unknown) => convertToModelMessages(messages),
  tool: (definition: unknown) => definition,
  stepCountIs: (count: number) => ({ type: "stepCountIs", count }),
  UI_MESSAGE_STREAM_HEADERS: {
    "content-type": "text/event-stream; charset=utf-8",
    "x-vercel-ai-ui-message-stream": "v1",
  },
}));

vi.mock("@ai-sdk/google", () => ({
  google: (id: string) => ({ provider: "google", modelId: id }),
}));

vi.mock("@/lib/chat-context", () => ({
  loadCapturedChatContext: vi.fn(async (authorization: string | null) => {
    if (!authorization) {
      return { authorized: false, factsText: "Captured competitor facts: unavailable." };
    }
    return {
      authorized: true,
      factsText: "Captured competitor facts:\nSeller: Ayan Bags\n- [PRICE_DECREASE] Ayan Mall cut Tote Bag price",
    };
  }),
}));

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.resetModules();
    streamText.mockReset();
    streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok"),
    });
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-not-a-real-key";
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("streams through streamText with conversation history and abortSignal", async () => {
    const { POST } = await import("./route");
    const abort = new AbortController();
    const response = await POST(
      new Request("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
        },
        signal: abort.signal,
        body: JSON.stringify({
          messages: [
            { id: "1", role: "user", parts: [{ type: "text", text: "Which competitor changed price recently?" }] },
            { id: "2", role: "assistant", parts: [{ type: "text", text: "Ayan Mall cut a tote." }] },
            { id: "3", role: "user", parts: [{ type: "text", text: "How significant is that change?" }] },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(streamText).toHaveBeenCalledTimes(1);
    const args = streamText.mock.calls[0]?.[0] as {
      abortSignal: AbortSignal;
      messages: unknown[];
      model: { provider: string; modelId: string };
      system: string;
      tools: { queryCompetitorData: unknown; getCompetitors: unknown; getDashboardSummary: unknown };
      stopWhen: { type: string; count: number };
    };
    expect(args.abortSignal).toBeInstanceOf(AbortSignal);
    expect(args.abortSignal.aborted).toBe(false);
    expect(args.messages).toHaveLength(3);
    expect(args.model.provider).toBe("google");
    expect(args.model.modelId).toBe("gemini-3.6-flash");
    expect(args.system).toContain("Ayan Mall cut Tote Bag price");
    expect(args.system).toContain("Never invent");
    expect(args.tools).toHaveProperty("queryCompetitorData");
    expect(args.tools).toHaveProperty("getCompetitors");
    expect(args.tools).toHaveProperty("getDashboardSummary");
    expect(args.stopWhen).toEqual({ type: "stepCountIs", count: 6 });
  });

  it("rejects an empty user message", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer test-token" },
        body: JSON.stringify({
          messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "   " }] }],
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns 503 without GOOGLE_GENERATIVE_AI_API_KEY even if ANTHROPIC_API_KEY is set", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.ANTHROPIC_API_KEY = "should-not-be-used";
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer test-token" },
        body: JSON.stringify({
          messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "Which competitor changed price recently?" }] }],
        }),
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: expect.stringMatching(/GOOGLE_GENERATIVE_AI_API_KEY/),
    });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns 429 when the development sabotage header is set", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-chat-test-error": "429",
        },
        body: JSON.stringify({
          messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "Show prices" }] }],
        }),
      }),
    );
    expect(response.status).toBe(429);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns 500 when the development API sabotage header is set", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-chat-test-error": "api",
        },
        body: JSON.stringify({
          messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "Show prices" }] }],
        }),
      }),
    );
    expect(response.status).toBe(500);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("sabotages the first midstream submit, then streams on regenerate", async () => {
    const { POST } = await import("./route");
    const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "Show prices" }] }];
    const first = await POST(
      new Request("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-chat-test-error": "midstream",
        },
        body: JSON.stringify({ trigger: "submit-message", messages }),
      }),
    );
    expect(first.status).toBe(200);
    expect(await first.text()).toContain("MIDSTREAM_FAILURE");
    expect(streamText).not.toHaveBeenCalled();

    const retry = await POST(
      new Request("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-chat-test-error": "midstream",
        },
        body: JSON.stringify({ trigger: "regenerate-message", messages }),
      }),
    );
    expect(retry.status).toBe(200);
    expect(streamText).toHaveBeenCalledTimes(1);
  });

  it("does not return 429 on regenerate even if the sabotage header is still present", async () => {
    const { POST } = await import("./route");
    const retry = await POST(
      new Request("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-chat-test-error": "429",
        },
        body: JSON.stringify({
          trigger: "regenerate-message",
          messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "Show prices" }] }],
        }),
      }),
    );
    expect(retry.status).toBe(200);
    expect(streamText).toHaveBeenCalledTimes(1);
  });
});
