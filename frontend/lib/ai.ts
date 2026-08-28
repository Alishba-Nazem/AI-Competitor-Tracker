import type { Competitor, IntelligenceDashboard } from "@/lib/types";

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
export const MAX_CHAT_OUTPUT_TOKENS = 1600;
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
You help a shop owner understand rival prices, catalog changes, and customer reviews from their dashboard.

Rules:
- Use tools whenever the answer depends on current dashboard or database information (competitor names, URLs, product lists, prices, counts, changes, or an overview).
- Never invent competitors, products, prices, ratings, review counts, or dates.
- Prefer actual tool results and captured facts over generic explanations.
- "No changes" is not the same as "no data." If products exist but the latest snapshot comparison found no diffs, say the data exists and no changes were detected.
- Do not say information is "not recorded" or "no matching competitor data found" when tools returned competitor, product, or price records.
- If the user asks the competitor name, who they are tracking, or a competitor URL, call getCompetitors and use the stored name and url fields.
- If the user asks how many competitors/products/changes they have, or wants a dashboard overview, call getDashboardSummary. Use getCompetitors when names or URLs are needed.
- When the user asks to compare current prices, cheapest/most expensive products, or the product catalog, call queryCompetitorData. Use products and priceSummary even when hasChanges is false.
- When the user asks whether prices or catalog items changed, call queryCompetitorData. If status is "stable" or hasChanges is false with productCount > 0, say no changes were detected in the latest snapshot comparison.
- Do not claim you scraped a live page just now; you are reading stored captures.
- If a tool says there are no competitors, no products, or the requested records do not exist, say that clearly.
- Keep answers concise and directly answer the question. Short paragraphs, bullet lists, and bold labels. Avoid nested code fences.
- Do not contradict a tool card. If products were found, do not also say no matching data was found.`;

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

export type ChatErrorKind =
  | "rate_limit"
  | "server"
  | "network"
  | "interrupted"
  | "auth"
  | "config"
  | "stopped"
  | "generic";

export type ChatErrorView = {
  kind: ChatErrorKind;
  title: string;
  detail: string;
  retryable: boolean;
};

export function classifyChatError(error: unknown): ChatErrorView {
  const raw = errorMessageFromUnknown(error);
  const fromJson = jsonErrorMessage(raw);
  const text = fromJson || raw;
  if (/aborterror|aborted|abort/i.test(text) && !/midstream|interrupted/i.test(text)) {
    return {
      kind: "stopped",
      title: "Generation stopped",
      detail: "You stopped this reply.",
      retryable: false,
    };
  }
  if (/api key|GOOGLE_GENERATIVE_AI_API_KEY|API_KEY_INVALID|not configured/i.test(text)) {
    return {
      kind: "config",
      title: "Gemini is not configured",
      detail: "Add GOOGLE_GENERATIVE_AI_API_KEY to the frontend environment and restart.",
      retryable: false,
    };
  }
  if (/HTTP_429|\b429\b|too many requests|quota|rate.?limit|resource.?exhausted/i.test(text)) {
    return {
      kind: "rate_limit",
      title: "Too many requests",
      detail: "Please wait a moment and try again.",
      retryable: true,
    };
  }
  if (/MIDSTREAM_FAILURE|interrupted|could not be completed/i.test(text)) {
    return {
      kind: "interrupted",
      title: "Response interrupted",
      detail: "The AI response could not be completed.",
      retryable: true,
    };
  }
  if (/HTTP_500|\b50[234]\b|temporarily unavailable|analysis service/i.test(text)) {
    return {
      kind: "server",
      title: "Something went wrong",
      detail: "The analysis service is temporarily unavailable.",
      retryable: true,
    };
  }
  if (/NETWORK_FAILURE|failed to fetch|networkerror|connection lost|check your internet/i.test(text)) {
    return {
      kind: "network",
      title: "Connection lost",
      detail: "Check your internet connection and try again.",
      retryable: true,
    };
  }
  if (/sign in/i.test(text)) {
    return {
      kind: "auth",
      title: "Sign in required",
      detail: "Sign in to ask about your captured competitor data.",
      retryable: false,
    };
  }
  if (/no longer available|NOT_FOUND|model .* not (found|available)|\b404\b/i.test(text)) {
    return {
      kind: "server",
      title: "Something went wrong",
      detail: "The analysis service is temporarily unavailable.",
      retryable: true,
    };
  }
  return {
    kind: "generic",
    title: "Something went wrong",
    detail: "We couldn't complete this analysis.",
    retryable: true,
  };
}

export function publicChatError(error: unknown) {
  const view = classifyChatError(error);
  if (view.kind === "stopped") return "Generation stopped.";
  if (view.kind === "config") {
    return "Gemini is not configured on the server. Add GOOGLE_GENERATIVE_AI_API_KEY to the frontend environment and restart.";
  }
  return `${view.title}. ${view.detail}`;
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

export function formatCapturedFacts(
  dashboard: IntelligenceDashboard | null,
  competitors: Array<Pick<Competitor, "name" | "url"> & { platform?: string | null; isActive?: boolean }> = [],
) {
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

  if (competitors.length > 0) {
    lines.push("Tracked competitor records (name is the store/brand):");
    for (const competitor of competitors.slice(0, 12)) {
      const platform = competitor.platform ? `; platform ${competitor.platform}` : "";
      const active = competitor.isActive === false ? "; inactive" : "";
      lines.push(`- ${competitor.name} | ${competitor.url}${platform}${active}`);
    }
  } else if (summary.competitorCount > 0) {
    lines.push("Competitor names are stored in the database. Call getCompetitors to read the name and URL.");
  }

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
    "Which competitors changed prices recently?",
    "Show me the biggest price changes.",
    "Compare competitor product prices.",
    "What new products were detected?",
  ];
  const priceFinding = dashboard?.findings.find(
    (item) => item.kind === "PRICE_DECREASE" || item.kind === "PRICE_INCREASE",
  );
  if (priceFinding) {
    prompts[0] = `Explain this captured change: ${priceFinding.title}`;
  }
  return prompts;
}
