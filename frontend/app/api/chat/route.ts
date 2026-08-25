import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  CHAT_SYSTEM_PROMPT,
  CHAT_TEMPERATURE,
  geminiModelId,
  isGeminiConfigured,
  lastUserText,
  MAX_CHAT_OUTPUT_TOKENS,
  missingGeminiKeyMessage,
  parseChatMessages,
  publicChatError,
} from "@/lib/ai";
import { loadCapturedChatContext } from "@/lib/chat-context";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chat
 *
 * Streams a Gemini reply with streamText. The Google Generative AI key stays
 * on the server. Conversation history is forwarded so follow-up turns keep
 * context. req.signal is passed through so the client's Stop button aborts
 * generation.
 */
export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return Response.json({ error: missingGeminiKeyMessage() }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body with messages." }, { status: 400 });
  }

  const parsed = parseChatMessages(
    body && typeof body === "object" ? (body as { messages?: unknown }).messages : undefined,
  );
  if (!parsed) {
    return Response.json({ error: "messages must be a conversation array." }, { status: 400 });
  }
  if (!lastUserText(parsed)) {
    return Response.json({ error: "Type a question before sending." }, { status: 400 });
  }

  const authorization = request.headers.get("authorization");
  const context = await loadCapturedChatContext(authorization);
  if (!context.authorized) {
    return Response.json({ error: "Sign in to ask about your captured competitor data." }, { status: 401 });
  }

  try {
    const result = streamText({
      model: google(geminiModelId()),
      system: `${CHAT_SYSTEM_PROMPT}\n\n${context.factsText}`,
      messages: convertToModelMessages(parsed as UIMessage[]),
      temperature: CHAT_TEMPERATURE,
      maxOutputTokens: MAX_CHAT_OUTPUT_TOKENS,
      abortSignal: request.signal,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: parsed as UIMessage[],
      onError: publicChatError,
    });
  } catch (error) {
    return Response.json({ error: publicChatError(error) }, { status: 502 });
  }
}
