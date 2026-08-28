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
import { ChatFailureCard } from "@/components/chat-failure-card";
import { DashboardSummaryToolPart } from "@/components/dashboard-summary-tool";
import { GetCompetitorsToolPart } from "@/components/get-competitors-tool";
import { QueryCompetitorDataToolPart } from "@/components/query-competitor-data-tool";
import { StreamMarkdown } from "@/components/stream-markdown";
import {
  CHAT_API_PATH,
  classifyChatError,
  suggestedChatPrompts,
  textFromChatMessage,
} from "@/lib/ai";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import {
  CHAT_TEST_ERROR_HEADER,
  chatTriggerFromRequestBody,
  developmentSabotageForRequest,
  parseChatTestError,
} from "@/lib/ai/chat-test-error";
import { getAuthToken } from "@/lib/auth";
import type { IntelligenceDashboard } from "@/lib/types";

const BOTTOM_THRESHOLD_PX = 72;

export function AiChat({
  dashboard = null,
  className = "",
  testErrorQuery = null,
}: {
  dashboard?: IntelligenceDashboard | null;
  className?: string;
  testErrorQuery?: string | null;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const retryLock = useRef(false);
  const lastRetryableError = useRef<ReturnType<typeof classifyChatError> | null>(null);
  const [input, setInput] = useState("");
  const [showJump, setShowJump] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const testError = parseChatTestError(testErrorQuery);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: CHAT_API_PATH,
        headers: (): Record<string, string> => {
          const token = getAuthToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        prepareSendMessagesRequest: ({
          api,
          id,
          messages: history,
          body,
          headers,
          credentials,
          trigger,
          messageId,
        }) => {
          const nextHeaders = Object.fromEntries(new Headers(headers).entries());
          const sabotage = developmentSabotageForRequest(testError, trigger);
          if (sabotage) nextHeaders[CHAT_TEST_ERROR_HEADER] = sabotage;
          return {
            api,
            credentials,
            headers: nextHeaders,
            body: { ...body, id, messages: history, trigger, messageId },
          };
        },
        fetch: async (input, init) => {
          const sabotage = developmentSabotageForRequest(testError, chatTriggerFromRequestBody(init?.body));
          if (sabotage === "network") {
            throw new TypeError("Failed to fetch");
          }
          let response: Response;
          try {
            response = await fetch(input, init);
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") throw error;
            throw new Error("NETWORK_FAILURE");
          }
          if (response.status === 429) throw new Error("HTTP_429");
          if (response.status >= 500) throw new Error("HTTP_500");
          if (!response.ok) {
            const body = await response.text();
            throw new Error(body || `Request failed (${response.status}).`);
          }
          return response;
        },
      }),
    [testError],
  );

  const { messages, sendMessage, regenerate, status, stop, error, clearError } = useChat<ChatMessage>({
    transport,
  });
  const busy = status === "submitted" || status === "streaming";
  const errorView = error ? classifyChatError(error) : null;
  if (errorView && errorView.kind !== "stopped") lastRetryableError.current = errorView;
  const displayedError =
    errorView && errorView.kind !== "stopped"
      ? errorView
      : retrying && !busy
        ? lastRetryableError.current
        : null;
  const showError = Boolean(displayedError);
  const lastMessage = messages[messages.length - 1];
  const showThinking =
    status === "submitted" ||
    (status === "streaming" && lastMessage?.role === "assistant" && !hasVisibleAssistantParts(lastMessage));

  const prompts = suggestedChatPrompts(dashboard);
  const canSend = Boolean(input.trim()) && !busy && !retrying;

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
  }, [messages, status, showThinking, showError]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updatePinned, { passive: true });
    return () => el.removeEventListener("scroll", updatePinned);
  }, [updatePinned]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const syncKeyboard = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty("--chat-keyboard-inset", `${inset}px`);
    };
    syncKeyboard();
    viewport.addEventListener("resize", syncKeyboard);
    viewport.addEventListener("scroll", syncKeyboard);
    return () => {
      viewport.removeEventListener("resize", syncKeyboard);
      viewport.removeEventListener("scroll", syncKeyboard);
      document.documentElement.style.removeProperty("--chat-keyboard-inset");
    };
  }, []);

  function jumpToLatest() {
    const el = scrollerRef.current;
    if (!el) return;
    pinnedToBottom.current = true;
    setShowJump(false);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  function submitText(text: string) {
    const next = text.trim();
    if (!next || busy || retrying || retryLock.current) return;
    clearError();
    pinnedToBottom.current = true;
    setShowJump(false);
    setInput("");
    void sendMessage({ text: next });
  }

  function retryFailedTurn() {
    if (retryLock.current || busy || retrying) return;
    const messageId = lastAssistantMessageId(messages);
    retryLock.current = true;
    setRetrying(true);
    clearError();
    pinnedToBottom.current = true;
    void (messageId ? regenerate({ messageId }) : regenerate())
      .catch(() => undefined)
      .finally(() => {
        retryLock.current = false;
        setRetrying(false);
      });
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
    <div
      className={`flex min-h-0 flex-col overflow-hidden border border-slate-200 bg-white ${className}`}
      style={{ paddingBottom: "var(--chat-keyboard-inset, 0px)" }}
    >
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollerRef}
          className="chat-scroller h-full overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
          tabIndex={0}
          aria-label="Conversation"
        >
          {messages.length === 0 && !showThinking ? (
            <EmptyChat prompts={prompts} disabled={busy || retrying} onPick={submitText} />
          ) : (
            <ol className="space-y-3">
              {messages.map((message) => {
                const text = textFromChatMessage(message);
                const isAssistant = message.role === "assistant";
                const isLiveEmpty =
                  isAssistant &&
                  message.id === lastMessage?.id &&
                  !hasVisibleAssistantParts(message) &&
                  (status === "streaming" || status === "submitted" || retrying);
                const interrupted =
                  isAssistant &&
                  message.id === lastMessage?.id &&
                  showError &&
                  displayedError?.kind === "interrupted" &&
                  hasVisibleAssistantParts(message);
                return (
                  <li key={message.id}>
                    {isAssistant ? (
                      <AssistantBubble interrupted={interrupted}>
                        {isLiveEmpty ? (
                          <ThinkingIndicator />
                        ) : (
                          <AssistantParts
                            message={message}
                            onRetryTool={retryFailedTurn}
                            retryDisabled={busy || retrying}
                            retrying={retrying}
                          />
                        )}
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
              {showError && displayedError ? (
                <li>
                  <ChatFailureCard
                    title={displayedError.title}
                    detail={displayedError.detail}
                    retryable={displayedError.retryable}
                    retrying={retrying || busy}
                    onRetry={retryFailedTurn}
                  />
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

      <form
        onSubmit={onSubmit}
        className="border-t border-slate-200 bg-slate-50/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
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
            disabled={busy || retrying}
            placeholder={busy || retrying ? "Analyzing competitor data…" : "Ask about prices, catalog changes, or reviews…"}
            className="max-h-32 min-h-11 flex-1 resize-y !py-2.5 text-base sm:text-sm"
            aria-describedby="ai-chat-hint"
            autoComplete="off"
            enterKeyHint="send"
          />
          {busy ? (
            <button type="button" className="button-danger shrink-0" onClick={onStop} aria-label="Stop generating">
              Stop
            </button>
          ) : (
            <button type="submit" className="button-primary shrink-0" disabled={!canSend}>
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
      <p className="text-sm font-semibold text-slate-900">Ask the AI Analyst about your competitors</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Analyze prices, products, catalog changes, and competitor activity.
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

function AssistantParts({
  message,
  onRetryTool,
  retryDisabled,
  retrying,
}: {
  message: ChatMessage;
  onRetryTool: () => void;
  retryDisabled: boolean;
  retrying: boolean;
}) {
  return (
    <div className="space-y-2">
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          if (!part.text.trim()) return null;
          return <StreamMarkdown key={`${message.id}-text-${index}`} text={part.text} />;
        }
        if (part.type === "tool-queryCompetitorData") {
          return (
            <QueryCompetitorDataToolPart
              key={part.toolCallId}
              part={part}
              onRetry={onRetryTool}
              retryDisabled={retryDisabled}
              retrying={retrying}
            />
          );
        }
        if (part.type === "tool-getCompetitors") {
          return (
            <GetCompetitorsToolPart
              key={part.toolCallId}
              part={part}
              onRetry={onRetryTool}
              retryDisabled={retryDisabled}
              retrying={retrying}
            />
          );
        }
        if (part.type === "tool-getDashboardSummary") {
          return (
            <DashboardSummaryToolPart
              key={part.toolCallId}
              part={part}
              onRetry={onRetryTool}
              retryDisabled={retryDisabled}
              retrying={retrying}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function lastAssistantMessageId(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") return messages[index].id;
  }
  return undefined;
}

function hasVisibleAssistantParts(message: ChatMessage) {
  return message.parts.some((part) => {
    if (part.type === "text") return Boolean(part.text.trim());
    return part.type === "tool-queryCompetitorData" || part.type === "dynamic-tool" || part.type.startsWith("tool-");
  });
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="ml-auto max-w-[min(100%,28rem)] rounded bg-[#163e62] px-3 py-2 text-sm leading-6 break-words text-white">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">You</p>
      <p className="whitespace-pre-wrap break-words">{text}</p>
    </div>
  );
}

function AssistantBubble({ children, interrupted = false }: { children: ReactNode; interrupted?: boolean }) {
  return (
    <div className="mr-auto max-w-[min(100%,36rem)] rounded border border-slate-200 bg-white px-3 py-2">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#163e62]">
        AI Competitor Analyst
      </p>
      {children}
      {interrupted ? (
        <p className="mt-2 text-xs font-semibold text-rose-800">Interrupted</p>
      ) : null}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="min-h-[4.5rem]" role="status" aria-live="polite">
      <p className="text-sm font-medium text-slate-800">Analyzing competitor data…</p>
      <div className="mt-3 space-y-2" aria-hidden="true">
        <div className="h-2 w-5/6 animate-pulse rounded bg-slate-200" />
        <div className="h-2 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-2 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}
