"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { StreamMarkdown } from "@/components/stream-markdown";
import { CHAT_API_PATH, publicChatError, suggestedChatPrompts, textFromChatMessage } from "@/lib/ai";
import { getAuthToken } from "@/lib/auth";
import type { IntelligenceDashboard } from "@/lib/types";

const BOTTOM_THRESHOLD_PX = 72;

export function AiChat({
  dashboard = null,
  className = "",
}: {
  dashboard?: IntelligenceDashboard | null;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [showJump, setShowJump] = useState(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: CHAT_API_PATH,
        headers: (): Record<string, string> => {
          const token = getAuthToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          if (!response.ok) {
            const body = await response.text();
            throw new Error(body || `Request failed (${response.status}).`);
          }
          return response;
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    transport,
  });
  const busy = status === "submitted" || status === "streaming";
  const errorText = error ? publicChatError(error) : null;
  const showError = Boolean(errorText && errorText !== "Generation stopped.");
  const lastMessage = messages[messages.length - 1];
  const lastAssistantText =
    lastMessage?.role === "assistant" ? textFromChatMessage(lastMessage) : "";
  const showThinking =
    status === "submitted" || (status === "streaming" && lastMessage?.role === "assistant" && !lastAssistantText.trim());

  const prompts = suggestedChatPrompts(dashboard);

  const updatePinned = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const pinned = distance <= BOTTOM_THRESHOLD_PX;
    pinnedToBottom.current = pinned;
    setShowJump(!pinned && el.scrollHeight > el.clientHeight + 8);
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el || !pinnedToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status, showThinking]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updatePinned, { passive: true });
    return () => el.removeEventListener("scroll", updatePinned);
  }, [updatePinned]);

  function jumpToLatest() {
    const el = scrollerRef.current;
    if (!el) return;
    pinnedToBottom.current = true;
    setShowJump(false);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  function submitText(text: string) {
    const next = text.trim();
    if (!next || busy) return;
    clearError();
    pinnedToBottom.current = true;
    setShowJump(false);
    setInput("");
    void sendMessage({ text: next });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submitText(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitText(input);
    }
  }

  function onStop() {
    stop();
    textareaRef.current?.focus();
  }

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden border border-slate-200 bg-white ${className}`}>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollerRef}
          className="h-full overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-4"
          tabIndex={0}
          aria-label="Conversation"
        >
          {messages.length === 0 && !showThinking ? (
            <EmptyChat prompts={prompts} disabled={busy} onPick={submitText} />
          ) : (
            <ol className="space-y-3">
              {messages.map((message) => {
                const text = textFromChatMessage(message);
                const isAssistant = message.role === "assistant";
                const isLiveEmpty =
                  isAssistant &&
                  message.id === lastMessage?.id &&
                  !text.trim() &&
                  (status === "streaming" || status === "submitted");
                return (
                  <li key={message.id}>
                    {isAssistant ? (
                      <AssistantBubble>
                        {isLiveEmpty ? <ThinkingIndicator /> : <StreamMarkdown text={text} />}
                      </AssistantBubble>
                    ) : (
                      <UserBubble text={text} />
                    )}
                  </li>
                );
              })}
              {status === "submitted" && lastMessage?.role === "user" ? (
                <li>
                  <AssistantBubble>
                    <ThinkingIndicator />
                  </AssistantBubble>
                </li>
              ) : null}
            </ol>
          )}
        </div>
        {showJump ? (
          <button
            type="button"
            className="button-secondary absolute bottom-3 left-1/2 z-10 -translate-x-1/2 !px-3 !py-1.5 !text-xs shadow-sm"
            onClick={jumpToLatest}
          >
            Jump to latest
          </button>
        ) : null}
      </div>

      {showError ? (
        <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-800" role="alert">
          {errorText}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="border-t border-slate-200 bg-slate-50/80 p-3">
        <label htmlFor="ai-chat-input" className="sr-only">
          Message the AI Competitor Analyst
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="ai-chat-input"
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
            placeholder={busy ? "Waiting for Gemini…" : "Ask about prices, catalog changes, or reviews…"}
            className="max-h-32 min-h-11 flex-1 resize-y !py-2.5"
            aria-describedby="ai-chat-hint"
          />
          {busy ? (
            <button type="button" className="button-danger shrink-0" onClick={onStop} aria-label="Stop generating">
              Stop
            </button>
          ) : (
            <button type="submit" className="button-primary shrink-0" disabled={!input.trim()}>
              Send
            </button>
          )}
        </div>
        <p id="ai-chat-hint" className="mt-2 text-xs text-stone-600">
          Enter to send · Shift+Enter for a new line. Answers use stored captures only.
        </p>
      </form>
    </div>
  );
}

function EmptyChat({
  prompts,
  disabled,
  onPick,
}: {
  prompts: string[];
  disabled: boolean;
  onPick: (text: string) => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-6 text-center sm:py-10">
      <p className="text-sm font-semibold text-slate-900">AI Competitor Analyst</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Ask about competitor prices, new products, price moves, and review themes. Gemini only
        uses captured store data — it will say when a number is not in the tracker.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {prompts.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              className="button-secondary w-full !justify-start !px-3 !py-2 !text-left !text-sm !font-medium"
              disabled={disabled}
              onClick={() => onPick(prompt)}
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="ml-auto max-w-[min(100%,28rem)] rounded bg-[#163e62] px-3 py-2 text-sm leading-6 text-white">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">You</p>
      <p className="whitespace-pre-wrap break-words">{text}</p>
    </div>
  );
}

function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="mr-auto max-w-[min(100%,36rem)] rounded border border-slate-200 bg-white px-3 py-2">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#163e62]">
        AI Competitor Analyst
      </p>
      {children}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <p className="text-sm text-stone-600" role="status" aria-live="polite">
      AI is thinking…
    </p>
  );
}
