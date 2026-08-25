import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMessage = vi.fn();
const stop = vi.fn();
const clearError = vi.fn();
const chatState = {
  messages: [] as Array<{ id: string; role: "user" | "assistant"; parts: Array<{ type: string; text: string }> }>,
  status: "ready" as "ready" | "submitted" | "streaming" | "error",
  error: undefined as Error | undefined,
};

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: chatState.messages,
    status: chatState.status,
    error: chatState.error,
    sendMessage,
    stop,
    clearError,
  }),
}));

vi.mock("ai", () => ({
  DefaultChatTransport: class DefaultChatTransport {
    constructor(_options?: unknown) {}
  },
}));

import { AiChat } from "@/components/ai-chat";

describe("AiChat", () => {
  beforeEach(() => {
    sendMessage.mockClear();
    stop.mockClear();
    clearError.mockClear();
    chatState.messages = [];
    chatState.status = "ready";
    chatState.error = undefined;
  });

  it("shows an empty state and labeled composer", () => {
    render(<AiChat />);
    expect(screen.getByText("AI Competitor Analyst")).toBeInTheDocument();
    expect(screen.getByLabelText("Message the AI Competitor Analyst")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
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

  it("announces thinking before the first token", () => {
    chatState.status = "submitted";
    chatState.messages = [{ id: "u1", role: "user", parts: [{ type: "text", text: "Compare prices" }] }];
    render(<AiChat />);
    expect(screen.getByRole("status")).toHaveTextContent("AI is thinking");
  });
});
