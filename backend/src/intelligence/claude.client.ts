import { Injectable } from '@nestjs/common';
import { textFromGeminiPayload } from './briefing';

const DEFAULT_CLAUDE_MODEL = 'claude-3-5-haiku-20241022';
const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
const DEFAULT_TIMEOUT_MS = 45_000;

export type BriefingLlmProvider = 'gemini' | 'claude';

@Injectable()
export class ClaudeClient {
  provider(): BriefingLlmProvider | null {
    if (process.env.GEMINI_API_KEY?.trim()) return 'gemini';
    if (process.env.ANTHROPIC_API_KEY?.trim()) return 'claude';
    return null;
  }

  isConfigured() {
    return this.provider() !== null;
  }

  async completeJson(systemPrompt: string, userPrompt: string) {
    const provider = this.provider();
    if (provider === 'gemini') return this.completeGemini(systemPrompt, userPrompt);
    if (provider === 'claude') return this.completeClaude(systemPrompt, userPrompt);
    throw new Error('No Gemini or Claude API key is configured.');
  }

  private async completeGemini(systemPrompt: string, userPrompt: string) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const combined = `${systemPrompt}\n\n${userPrompt}`;

    const attempts: unknown[] = [
      {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: 'low' },
        },
      },
      {
        contents: [{ role: 'user', parts: [{ text: combined }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingLevel: 'minimal' },
        },
      },
      {
        contents: [{ parts: [{ text: combined }] }],
      },
    ];

    let lastError: Error | null = null;
    for (const body of attempts) {
      try {
        const payload = await this.postJson(url, body);
        const text = textFromGeminiPayload(
          payload as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string; thought?: boolean }> };
            }>;
          },
        );
        if (text) return text;
        lastError = new Error('Gemini returned an empty response.');
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error('Gemini request failed.');
      }
    }

    throw lastError ?? new Error('Gemini request failed.');
  }

  private async completeClaude(systemPrompt: string, userPrompt: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured.');
    }

    const payload = await this.postJson(
      'https://api.anthropic.com/v1/messages',
      {
        model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_CLAUDE_MODEL,
        max_tokens: 700,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      },
      {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    );

    const text = (payload as { content?: Array<{ type?: string; text?: string }> })
      .content
      ?.filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n')
      .trim();
    if (!text) {
      throw new Error('Claude returned an empty response.');
    }
    return text;
  }

  private async postJson(
    url: string,
    body: unknown,
    extraHeaders: Record<string, string> = {},
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let detail = `LLM request failed with ${response.status}.`;
        try {
          const failed = (await response.json()) as {
            error?: { message?: string };
          };
          if (failed.error?.message) detail = failed.error.message;
        } catch {
          // Keep the status-only message if the body is not JSON.
        }
        throw new Error(detail);
      }

      return (await response.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }
}
