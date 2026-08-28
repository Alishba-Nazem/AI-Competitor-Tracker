import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMessage = vi.fn();
const stop = vi.fn();
const clearError = vi.fn();
const regenerate = vi.fn(async () => undefined);
const chatState = {
  messages: [] as Array<{ id: string; role: "user" | "assistant"; parts: Array<Record<string, unknown>> }>,
  status: "ready" as "ready" | "submitted" | "streaming" | "error",
  error: undefined as Error | undefined,
};

type TransportOptions = {
  headers?: () => Record<string, string>;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  prepareSendMessagesRequest?: (options: {
    api: string;
    id: string;
    messages: unknown[];
    body: object;
    headers: Record<string, string>;
    trigger: "submit-message" | "regenerate-message";
    messageId: string | undefined;
  }) => { headers?: Record<string, string> } | Promise<{ headers?: Record<string, string> }>;
};

let lastTransportOptions: TransportOptions | null = null;

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: chatState.messages,
    status: chatState.status,
    error: chatState.error,
    sendMessage,
    stop,
    clearError,
    regenerate,
  }),
}));

vi.mock("ai", () => ({
  DefaultChatTransport: class DefaultChatTransport {
    constructor(options: TransportOptions) {
      lastTransportOptions = options;
    }
  },
}));

import { AiChat } from "@/components/ai-chat";

describe("AiChat", () => {
  beforeEach(() => {
    sendMessage.mockClear();
    stop.mockClear();
    clearError.mockClear();
    regenerate.mockReset();
    regenerate.mockImplementation(async () => undefined);
    lastTransportOptions = null;
    chatState.messages = [];
    chatState.status = "ready";
    chatState.error = undefined;
  });

  it("shows an onboarding empty state and labeled composer", () => {
    render(<AiChat />);
    expect(screen.getByText("Ask the AI Analyst about your competitors")).toBeInTheDocument();
    expect(screen.getByText(/Analyze prices, products, catalog changes/)).toBeInTheDocument();
    expect(screen.getByLabelText("Message the AI Competitor Analyst")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("does not send whitespace-only input from click or Enter", () => {
    render(<AiChat />);
    const field = screen.getByLabelText("Message the AI Competitor Analyst");
    fireEvent.change(field, { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.keyDown(field, { key: "Enter", shiftKey: false });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("sends the typed question and keeps conversation history in the hook", () => {
    render(<AiChat />);
    fireEvent.change(screen.getByLabelText("Message the AI Competitor Analyst"), {
      target: { value: "Which competitor changed price recently?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(sendMessage).toHaveBeenCalledWith({ text: "Which competitor changed price recently?" });
  });

  it("shows a Stop control while streaming and keeps the partial reply", () => {
    chatState.status = "streaming";
    chatState.messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "What should we do?" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "Recheck your tote price" }] },
    ];
    render(<AiChat />);
    expect(screen.getByText("Recheck your tote price")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop generating" }));
    expect(stop).toHaveBeenCalled();
    expect(screen.getByText("Recheck your tote price")).toBeInTheDocument();
  });

  it("renders a tool result card inside the assistant bubble", () => {
    chatState.messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "Show me recent competitor price changes." }] },
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-queryCompetitorData",
            toolCallId: "t1",
            state: "output-available",
            input: {},
            output: {
              queriedAt: "2026-08-25T00:00:00.000Z",
              competitorCount: 1,
              changeCount: 1,
              hasChanges: true,
              message: "Found 1 captured change.",
              changes: [
                {
                  competitorId: 10,
                  competitor: "Ayan Mall",
                  productId: 44,
                  product: "Tote Bag",
                  productUrl: "https://ayan.example/tote",
                  detectedChange: "PRICE_DECREASE",
                  previousPrice: 2400,
                  currentPrice: 2050,
                  priceChange: -350,
                  changePercentage: -14.6,
                  currency: "PKR",
                  availability: "IN_STOCK",
                },
              ],
            },
          },
        ],
      },
    ];
    render(<AiChat />);
    expect(screen.getByText("Tote Bag")).toBeInTheDocument();
    expect(screen.getByText("Ayan Mall")).toBeInTheDocument();
  });

  it("announces a skeleton loading state before the first token", () => {
    chatState.status = "submitted";
    chatState.messages = [{ id: "u1", role: "user", parts: [{ type: "text", text: "Compare prices" }] }];
    render(<AiChat />);
    expect(screen.getByRole("status")).toHaveTextContent("Analyzing competitor data");
  });

  it("retries only the failed turn via regenerate and ignores a second rapid click", () => {
    chatState.status = "error";
    chatState.error = new Error("MIDSTREAM_FAILURE");
    chatState.messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "Show price changes" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "Ayan Mall cut the tote" }] },
    ];
    render(<AiChat />);
    expect(screen.getByText("Response interrupted")).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(retry);
    fireEvent.click(retry);
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(regenerate).toHaveBeenCalledWith({ messageId: "a1" });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("disables Retry and shows Retrying... until regenerate settles", async () => {
    let finishRetry: (() => void) | undefined;
    regenerate.mockImplementation(
      () =>
        new Promise<undefined>((resolve) => {
          finishRetry = () => resolve(undefined);
        }),
    );
    chatState.status = "error";
    chatState.error = new Error("MIDSTREAM_FAILURE");
    chatState.messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "Show price changes" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "Ayan Mall cut the tote" }] },
    ];
    render(<AiChat />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    const retrying = await screen.findByRole("button", { name: "Retrying..." });
    expect(retrying).toBeDisabled();
    fireEvent.click(retrying);
    expect(regenerate).toHaveBeenCalledTimes(1);
    finishRetry?.();
  });

  it("retries the last assistant turn when several assistant messages exist", () => {
    chatState.status = "error";
    chatState.error = new Error("MIDSTREAM_FAILURE");
    chatState.messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "First" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "Earlier reply" }] },
      { id: "u2", role: "user", parts: [{ type: "text", text: "Show price changes" }] },
      { id: "a2", role: "assistant", parts: [{ type: "text", text: "Ayan Mall cut the tote" }] },
    ];
    render(<AiChat />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(regenerate).toHaveBeenCalledWith({ messageId: "a2" });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("omits the midstream sabotage header on regenerate so Retry can succeed", async () => {
    render(<AiChat testErrorQuery="midstream" />);
    const prepare = lastTransportOptions?.prepareSendMessagesRequest;
    expect(prepare).toEqual(expect.any(Function));
    const submitted = await prepare?.({
      api: "/api/chat",
      id: "chat-1",
      messages: [],
      body: {},
      headers: {},
      trigger: "submit-message",
      messageId: undefined,
    });
    const retried = await prepare?.({
      api: "/api/chat",
      id: "chat-1",
      messages: [],
      body: {},
      headers: {},
      trigger: "regenerate-message",
      messageId: "a1",
    });
    expect(submitted?.headers).toEqual(expect.objectContaining({ "x-chat-test-error": "midstream" }));
    expect(retried?.headers).toBeDefined();
    expect(retried?.headers).not.toEqual(expect.objectContaining({ "x-chat-test-error": "midstream" }));
    expect(retried?.headers && "x-chat-test-error" in retried.headers).toBe(false);
  });

  it("does not throw the network sabotage on a regenerate request", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response("ok", { status: 200 })) as typeof fetch;
    try {
      render(<AiChat testErrorQuery="network" />);
      const fetchImpl = lastTransportOptions?.fetch;
      expect(fetchImpl).toEqual(expect.any(Function));
      await expect(
        fetchImpl?.("/api/chat", {
          method: "POST",
          body: JSON.stringify({ trigger: "submit-message", messages: [] }),
        }),
      ).rejects.toThrow(/Failed to fetch/);
      const retryResponse = await fetchImpl?.("/api/chat", {
        method: "POST",
        body: JSON.stringify({ trigger: "regenerate-message", messages: [] }),
      });
      expect(retryResponse?.ok).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("shows a rate-limit message for HTTP 429 without raw JSON", () => {
    chatState.status = "error";
    chatState.error = new Error("HTTP_429");
    chatState.messages = [{ id: "u1", role: "user", parts: [{ type: "text", text: "Compare prices" }] }];
    render(<AiChat />);
    expect(screen.getByText("Too many requests")).toBeInTheDocument();
    expect(screen.queryByText("HTTP_429")).not.toBeInTheDocument();
  });
});
