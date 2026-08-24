import type { IntelligenceFinding, MarketAnalysis } from './intelligence.types';

export type BriefingFacts = {
  businessName?: string | null;
  category?: string | null;
  country?: string | null;
  competitorCount: number;
  productCount: number;
  capturedProductCount: number;
  reviewCount: number;
  findings: Array<{ kind: string; title: string; detail: string }>;
  priceBand: {
    min: number;
    max: number;
    median: number;
    currency: string;
    sampleSize: number;
  } | null;
  likes: Array<{ theme: string; count: number }>;
  complaints: Array<{ theme: string; count: number }>;
  sentiment?: {
    rated: number;
    positive: number;
    neutral: number;
    negative: number;
    averageRating: number | null;
  } | null;
};

export type IntelligenceBriefing = {
  source: 'gemini' | 'claude' | 'fallback';
  available: boolean;
  headline: string;
  bullets: string[];
  risks: string[];
  nextActions: string[];
  message?: string;
};

export const BRIEFING_SYSTEM_PROMPT = `You are a competitive-intelligence analyst for an ecommerce seller.
Write a short briefing from ONLY the supplied captured facts.
Rules:
- Never invent prices, products, review counts, or competitors.
- If a number is not in the facts, do not guess it.
- Prefer decisions a store owner can act on this week.
- Return JSON only, no markdown, matching this shape:
{"headline":"string","bullets":["string"],"risks":["string"],"nextActions":["string"]}
- headline: one sentence, max 140 characters.
- bullets: 3 to 6 items.
- risks: 0 to 3 items.
- nextActions: 1 to 4 items.`;

export function factsFromDashboard(dashboard: {
  profile: { businessName: string; category: string; country: string } | null;
  summary: {
    competitorCount: number;
    productCount: number;
    capturedProductCount: number;
    reviewCount: number;
  };
  findings: IntelligenceFinding[];
  market: MarketAnalysis;
}): BriefingFacts {
  return {
    businessName: dashboard.profile?.businessName ?? null,
    category: dashboard.profile?.category ?? null,
    country: dashboard.profile?.country ?? null,
    competitorCount: dashboard.summary.competitorCount,
    productCount: dashboard.summary.productCount,
    capturedProductCount: dashboard.summary.capturedProductCount,
    reviewCount: dashboard.summary.reviewCount,
    findings: dashboard.findings.slice(0, 16).map((finding) => ({
      kind: finding.kind,
      title: finding.title,
      detail: finding.detail,
    })),
    priceBand: dashboard.market.priceBand,
    likes: dashboard.market.likes.slice(0, 5).map((item) => ({
      theme: item.theme,
      count: item.count,
    })),
    complaints: dashboard.market.complaints.slice(0, 5).map((item) => ({
      theme: item.theme,
      count: item.count,
    })),
    sentiment: {
      rated: dashboard.market.sentiment.rated,
      positive: dashboard.market.sentiment.positive,
      neutral: dashboard.market.sentiment.neutral,
      negative: dashboard.market.sentiment.negative,
      averageRating: dashboard.market.sentiment.averageRating,
    },
  };
}

export function buildBriefingUserPrompt(facts: BriefingFacts) {
  return [
    `Seller: ${facts.businessName || 'Unknown'}`,
    `Category: ${facts.category || 'Unknown'}`,
    `Market: ${facts.country || 'Unknown'}`,
    `Tracked competitors: ${facts.competitorCount}`,
    `Discovered products: ${facts.productCount}`,
    `Captured prices: ${facts.capturedProductCount}`,
    `Stored reviews: ${facts.reviewCount}`,
    facts.sentiment && facts.sentiment.rated > 0
      ? `Rated reviews: ${facts.sentiment.rated} (positive 4-5★ ${facts.sentiment.positive}, neutral 3★ ${facts.sentiment.neutral}, negative 1-2★ ${facts.sentiment.negative}, average ${facts.sentiment.averageRating ?? 'unknown'})`
      : 'Rated reviews: none captured yet',
    facts.priceBand
      ? `Observed price band (${facts.priceBand.currency}): min ${facts.priceBand.min}, median ${facts.priceBand.median}, max ${facts.priceBand.max} from ${facts.priceBand.sampleSize} products`
      : 'Observed price band: none captured yet',
    `Customer likes: ${
      facts.likes.length
        ? facts.likes.map((item) => `${item.theme} (${item.count})`).join(', ')
        : 'none yet'
    }`,
    `Customer complaints: ${
      facts.complaints.length
        ? facts.complaints.map((item) => `${item.theme} (${item.count})`).join(', ')
        : 'none yet'
    }`,
    'Captured findings:',
    facts.findings.length
      ? facts.findings
          .map((finding) => `- [${finding.kind}] ${finding.title}: ${finding.detail}`)
          .join('\n')
      : '- none yet',
  ].join('\n');
}

export function textFromGeminiPayload(payload: {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
  }>;
}) {
  const parts =
    payload.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ??
    [];
  const visible = parts.filter((part) => !part.thought && part.text?.trim());
  const chosen = visible.length > 0 ? visible : parts;
  return chosen
    .map((part) => part.text)
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n')
    .trim();
}

export function parseBriefingJson(raw: string): Omit<
  IntelligenceBriefing,
  'source' | 'available' | 'message'
> | null {
  const extracted = extractJsonObject(raw);
  if (!extracted) return null;
  try {
    const parsed = JSON.parse(extracted) as {
      headline?: unknown;
      title?: unknown;
      summary?: unknown;
      bullets?: unknown;
      points?: unknown;
      findings?: unknown;
      risks?: unknown;
      nextActions?: unknown;
      next_actions?: unknown;
      actions?: unknown;
    };
    const headline =
      asTrimmedString(parsed.headline) ||
      asTrimmedString(parsed.title) ||
      asTrimmedString(parsed.summary);
    const bullets = asStringList(
      parsed.bullets ?? parsed.points ?? parsed.findings,
      6,
    );
    const risks = asStringList(parsed.risks, 3);
    const nextActions = asStringList(
      parsed.nextActions ?? parsed.next_actions ?? parsed.actions,
      4,
    );
    if (!headline || bullets.length === 0) return null;
    return {
      headline: headline.slice(0, 180),
      bullets,
      risks,
      nextActions,
    };
  } catch {
    return null;
  }
}

export function publicLlmFailureMessage(
  provider: 'gemini' | 'claude',
  error: unknown,
) {
  const label = provider === 'gemini' ? 'Gemini' : 'Claude';
  const raw = error instanceof Error ? error.message : '';
  if (/quota|rate.?limit|resource.?exhausted|\b429\b/i.test(raw)) {
    return `${label} is rate-limited right now. Showing a briefing from captured prices, changes, and reviews only.`;
  }
  return `${label} is unavailable. Showing a briefing from captured prices, changes, and reviews only.`;
}

export function fallbackBriefing(
  facts: BriefingFacts,
  reason: string,
): IntelligenceBriefing {
  if (
    facts.competitorCount === 0 &&
    facts.findings.length === 0 &&
    facts.reviewCount === 0
  ) {
    return {
      source: 'fallback',
      available: false,
      headline: 'No captured competitor data yet',
      bullets: [],
      risks: [],
      nextActions: [
        'Add competitor store URLs and complete onboarding.',
        'Capture prices and public reviews before asking for a briefing.',
      ],
      message: reason,
    };
  }

  const bullets = facts.findings.slice(0, 5).map((finding) => finding.detail);
  if (facts.priceBand) {
    bullets.unshift(
      `Captured prices sit between ${facts.priceBand.min} and ${facts.priceBand.max} ${facts.priceBand.currency} (median ${facts.priceBand.median}).`,
    );
  }
  if (facts.complaints[0]) {
    bullets.push(
      `Customers repeat “${facts.complaints[0].theme}” in ${facts.complaints[0].count} stored reviews.`,
    );
  }

  const nextActions = [
    facts.capturedProductCount === 0
      ? 'Capture competitor catalogs so prices can be compared.'
      : 'Re-capture active competitors to confirm the latest prices.',
  ];
  if (facts.reviewCount === 0) {
    nextActions.push('Capture public reviews to see repeated customer complaints.');
  } else if (facts.complaints[0]) {
    nextActions.push(
      `Check whether your own listing addresses “${facts.complaints[0].theme}”.`,
    );
  }

  return {
    source: 'fallback',
    available: true,
    headline:
      facts.findings[0]?.title ||
      `Update from ${facts.competitorCount} tracked competitor${facts.competitorCount === 1 ? '' : 's'}`,
    bullets: uniqueStrings(bullets).slice(0, 6),
    risks: facts.complaints.slice(0, 2).map(
      (item) => `Repeated complaint: ${item.theme} (${item.count} reviews)`,
    ),
    nextActions: nextActions.slice(0, 4),
    message: reason,
  };
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  let start = candidate.indexOf('{');
  let lastValid: string | null = null;
  while (start !== -1) {
    const end = candidate.lastIndexOf('}');
    if (end <= start) break;
    const slice = candidate.slice(start, end + 1);
    try {
      JSON.parse(slice);
      lastValid = slice;
      break;
    } catch {
      start = candidate.indexOf('{', start + 1);
    }
  }
  return lastValid;
}

function asTrimmedString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asStringList(value: unknown, max: number) {
  if (typeof value === 'string' && value.trim()) {
    return uniqueStrings(
      value
        .split(/\n|•|- /)
        .map((item) => item.trim())
        .filter(Boolean),
    ).slice(0, max);
  }
  if (!Array.isArray(value)) return [];
  return uniqueStrings(
    value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean),
  ).slice(0, max);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}
