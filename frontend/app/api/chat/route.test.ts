import { beforeEach, describe, expect, it, vi } from "vitest";

const streamText = vi.fn();
const convertToModelMessages = vi.fn((messages: unknown) => messages);

vi.mock("ai", () => ({
  streamText: (options: unknown) => streamText(options),
  convertToModelMessages: (messages: unknown) => convertToModelMessages(messages),
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
    };
    expect(args.abortSignal).toBeInstanceOf(AbortSignal);
    expect(args.abortSignal.aborted).toBe(false);
    expect(args.messages).toHaveLength(3);
    expect(args.model.provider).toBe("google");
    expect(args.model.modelId).toBe("gemini-3.6-flash");
    expect(args.system).toContain("Ayan Mall cut Tote Bag price");
    expect(args.system).toContain("Never invent");
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
});
