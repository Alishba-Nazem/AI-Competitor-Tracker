import type { IntelligenceDashboard } from "@/lib/types";

/**
 * Central Gemini configuration for the streaming competitor-intelligence chat.
 *
 * GOOGLE_GENERATIVE_AI_API_KEY is read only on the server (app/api/chat). It
 * must never be exposed with a NEXT_PUBLIC_ prefix or sent to the browser.
 */

export const GOOGLE_API_KEY_ENV = "GOOGLE_GENERATIVE_AI_API_KEY";
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
export const CHAT_API_PATH = "/api/chat";
export const MAX_CHAT_MESSAGES = 24;
export const MAX_CHAT_OUTPUT_TOKENS = 1200;
export const CHAT_TEMPERATURE = 0.2;

/**
 * System prompt for the AI Competitor Analyst.
 *
 * Responsibilities:
 * - Stay inside captured competitor / product / price / review facts supplied
 *   in this request. Never invent a store, SKU, price, rating, or change.
 * - Explain price moves clearly (amount, direction, why it matters).
 * - Compare competitors only when both sides appear in the captured facts.
 * - Flag important catalog or review shifts and suggest next actions.
 * - Say plainly when the required data has not been captured yet.
 */
export const CHAT_SYSTEM_PROMPT = `You are the AI Competitor Analyst for Ecommerce Competitor Tracker.
You help a shop owner understand rival prices, catalog changes, and customer reviews.

Rules:
- Use ONLY the captured facts in this request and the conversation.
- Never invent competitors, products, prices, ratings, review counts, or dates.
- If a number or name is not in the captured facts, say it is not in the stored data.
- Prefer short, actionable answers a seller can use this week.
- Explain price changes with the stored amount and direction when those exist.
- Compare competitors only using captured prices, products, and review themes.
- Call out important changes (price cuts, new products, repeated complaints).
- Do not claim you scraped a live page just now; you are reading stored captures.
- Keep formatting simple: short paragraphs, bullet lists, and bold labels. Avoid nested code fences.`;

export type ChatUiMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
};

export function textFromChatMessage(message: ChatUiMessage) {
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content;
  }
  return (message.parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("");
}

export function parseChatMessages(value: unknown): ChatUiMessage[] | null {
  if (!Array.isArray(value)) return null;
  const messages: ChatUiMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    if (role !== "user" && role !== "assistant" && role !== "system") return null;
    messages.push(item as ChatUiMessage);
  }
  return messages.slice(-MAX_CHAT_MESSAGES);
}

export function lastUserText(messages: ChatUiMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    return textFromChatMessage(message).trim();
  }
  return "";
}

export function isGeminiConfigured() {
  return Boolean(process.env[GOOGLE_API_KEY_ENV]?.trim());
}

export function geminiModelId() {
  return process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function missingGeminiKeyMessage() {
  return "Gemini is not configured on the server. Add GOOGLE_GENERATIVE_AI_API_KEY to the frontend environment (not NEXT_PUBLIC_) and restart.";
}

export function publicChatError(error: unknown) {
  const raw = errorMessageFromUnknown(error);
  const fromJson = jsonErrorMessage(raw);
  const text = fromJson || raw;
  if (/api key|GOOGLE_GENERATIVE_AI_API_KEY|API_KEY_INVALID|not configured/i.test(text)) {
    return "Gemini is not configured on the server. Add GOOGLE_GENERATIVE_AI_API_KEY to the frontend environment and restart.";
  }
  if (/quota|rate.?limit|resource.?exhausted|\b429\b/i.test(text)) {
    return "Gemini is rate-limited right now. Try again in a minute.";
  }
  if (/no longer available|NOT_FOUND|model .* not (found|available)|\b404\b/i.test(text)) {
    return "This Gemini model is not available for your API key. Use a current free-tier model such as gemini-3.6-flash.";
  }
  if (/aborterror|aborted|abort/i.test(text)) {
    return "Generation stopped.";
  }
  if (/sign in/i.test(text)) {
    return "Sign in to ask about your captured competitor data.";
  }
  if (fromJson) return fromJson;
  return "Gemini could not answer just now. Check your connection and try again.";
}

function errorMessageFromUnknown(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; data?: { error?: { message?: unknown } } };
    if (typeof record.message === "string") return record.message;
    if (typeof record.data?.error?.message === "string") return record.data.error.message;
  }
  return "";
}

function jsonErrorMessage(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown };
    return typeof parsed.error === "string" ? parsed.error : null;
  } catch {
    return null;
  }
}

export function formatCapturedFacts(dashboard: IntelligenceDashboard | null) {
  if (!dashboard) {
    return [
      "Captured competitor facts: unavailable.",
      "Tell the user you cannot see stored prices, products, or reviews until they sign in and capture a competitor.",
    ].join("\n");
  }

  const { profile, summary, findings, market } = dashboard;
  const lines = [
    "Captured competitor facts (authoritative; do not add to these):",
    `Seller: ${profile?.businessName || "not set"}`,
    `Category: ${profile?.category || "not set"}`,
    `Market: ${profile?.country || "not set"}`,
    `Tracked competitors: ${summary.competitorCount}`,
    `Discovered products: ${summary.productCount}`,
    `Captured prices: ${summary.capturedProductCount}`,
    `Stored reviews: ${summary.reviewCount}`,
  ];

  if (market.priceBand) {
    lines.push(
      `Observed price band (${market.priceBand.currency}): min ${market.priceBand.min}, median ${market.priceBand.median}, max ${market.priceBand.max} from ${market.priceBand.sampleSize} products`,
    );
  } else {
    lines.push("Observed price band: none captured yet");
  }

  const sentiment = market.sentiment;
  if (sentiment?.rated > 0) {
    lines.push(
      `Rated reviews: ${sentiment.rated} (liked 4-5★ ${sentiment.positive}, mixed 3★ ${sentiment.neutral}, disliked 1-2★ ${sentiment.negative}, average ${sentiment.averageRating ?? "unknown"})`,
    );
  } else {
    lines.push("Rated reviews: none captured yet");
  }

  lines.push(
    `Customer likes: ${
      market.likes.length
        ? market.likes.map((item) => `${item.theme} (${item.count})`).join(", ")
        : "none yet"
    }`,
  );
  lines.push(
    `Customer complaints: ${
      market.complaints.length
        ? market.complaints.map((item) => `${item.theme} (${item.count})`).join(", ")
        : "none yet"
    }`,
  );

  if (findings.length === 0) {
    lines.push("Captured findings: none yet");
  } else {
    lines.push("Captured findings:");
    for (const finding of findings.slice(0, 16)) {
      lines.push(`- [${finding.kind}] ${finding.title}: ${finding.detail}`);
    }
  }

  return lines.join("\n");
}

export function suggestedChatPrompts(dashboard: IntelligenceDashboard | null) {
  const prompts = [
    "Which competitor changed price recently?",
    "How significant is that change?",
    "What should we do next?",
  ];
  const priceFinding = dashboard?.findings.find(
    (item) => item.kind === "PRICE_DECREASE" || item.kind === "PRICE_INCREASE",
  );
  if (priceFinding) {
    prompts[0] = `Explain this captured change: ${priceFinding.title}`;
  }
  const complaint = dashboard?.market.complaints[0];
  if (complaint) {
    prompts[2] = `What should we do about repeated “${complaint.theme}” complaints?`;
  }
  return prompts;
}
