import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, UI_MESSAGE_STREAM_HEADERS, type UIMessage } from "ai";
import { createChatTools } from "@/lib/ai/chat-tools";
import {
  chatTestErrorFromRequest,
  chatTriggerFromUnknown,
  developmentSabotageForRequest,
} from "@/lib/ai/chat-test-error";
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
 * generation. Tools may read competitors, products, dashboard totals, and
 * snapshot diffs from the Nest tracker API.
 */
export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return Response.json({ error: missingGeminiKeyMessage() }, { status: 503 });
  }

  const requestedTestError = chatTestErrorFromRequest(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body with messages." }, { status: 400 });
  }

  // Retry uses trigger=regenerate-message. Sabotage that too and Retry can never succeed
  // while ?testError= remains in the page URL / request header.
  const testError = developmentSabotageForRequest(requestedTestError, chatTriggerFromUnknown(body));
  if (testError === "429") {
    return Response.json({ error: "HTTP_429" }, { status: 429 });
  }
  if (testError === "api") {
    return Response.json({ error: "HTTP_500" }, { status: 500 });
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
  if (!context.authorized || !authorization) {
    return Response.json({ error: "Sign in to ask about your captured competitor data." }, { status: 401 });
  }

  if (testError === "midstream") {
    return sabotagedMidstreamResponse();
  }

  try {
    const result = streamText({
      model: google(geminiModelId()),
      system: `${CHAT_SYSTEM_PROMPT}\n\n${context.factsText}`,
      messages: convertToModelMessages(parsed as UIMessage[]),
      tools: createChatTools(authorization, { testError }),
      stopWhen: stepCountIs(6),
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

function sabotagedMidstreamResponse() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      send({ type: "start" });
      send({ type: "text-start", id: "sabotage-text" });
      send({
        type: "text-delta",
        id: "sabotage-text",
        delta: "Ayan Mall cut the tote price, then the stream",
      });
      await new Promise((resolve) => setTimeout(resolve, 80));
      send({ type: "error", errorText: "MIDSTREAM_FAILURE" });
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...UI_MESSAGE_STREAM_HEADERS,
      "content-type": "text/event-stream; charset=utf-8",
    },
  });
}
