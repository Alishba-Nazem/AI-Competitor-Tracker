export const CHAT_TEST_ERROR_HEADER = "x-chat-test-error";
export const CHAT_TEST_ERROR_QUERY = "testError";
export const CHAT_REGENERATE_TRIGGER = "regenerate-message";

export type ChatTestErrorKind = "network" | "api" | "midstream" | "429" | "tool" | "empty";

const KINDS = new Set<ChatTestErrorKind>(["network", "api", "midstream", "429", "tool", "empty"]);

export function isChatTestErrorAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_CHAT_TEST_ERRORS === "1";
}

export function parseChatTestError(value: string | null | undefined): ChatTestErrorKind | null {
  if (!isChatTestErrorAllowed()) return null;
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "500" || normalized === "api") return "api";
  if (KINDS.has(normalized as ChatTestErrorKind)) return normalized as ChatTestErrorKind;
  return null;
}

export function chatTriggerFromUnknown(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const trigger = (body as { trigger?: unknown }).trigger;
  return typeof trigger === "string" ? trigger : undefined;
}

export function chatTriggerFromRequestBody(body: BodyInit | null | undefined): string | undefined {
  if (typeof body !== "string") return undefined;
  try {
    return chatTriggerFromUnknown(JSON.parse(body) as unknown);
  } catch {
    return undefined;
  }
}

export function isRegenerateChatTrigger(trigger: string | undefined): boolean {
  return trigger === CHAT_REGENERATE_TRIGGER;
}

/**
 * Dev sabotage is for the first submit only. Retry uses AI SDK `regenerate()`,
 * which sends `trigger: regenerate-message`. If we also sabotaged that request,
 * Retry could never succeed while `?testError=` stayed in the URL.
 */
export function developmentSabotageForRequest(
  kind: ChatTestErrorKind | null,
  trigger: string | undefined,
): ChatTestErrorKind | null {
  if (!kind || isRegenerateChatTrigger(trigger)) return null;
  return kind;
}

export function chatTestErrorFromRequest(request: Request): ChatTestErrorKind | null {
  if (!isChatTestErrorAllowed()) return null;
  const header = request.headers.get(CHAT_TEST_ERROR_HEADER);
  const fromQuery = new URL(request.url).searchParams.get(CHAT_TEST_ERROR_QUERY);
  return parseChatTestError(header || fromQuery);
}
