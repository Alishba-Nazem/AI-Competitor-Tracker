import {
  BRIEFING_SYSTEM_PROMPT,
  buildBriefingUserPrompt,
  fallbackBriefing,
  parseBriefingJson,
  type BriefingFacts,
} from './briefing';

const facts: BriefingFacts = {
  businessName: 'Bag store',
  category: 'Women bag',
  country: 'Pakistan',
  competitorCount: 2,
  productCount: 12,
  capturedProductCount: 8,
  reviewCount: 20,
  findings: [
    {
      kind: 'PRICE_DECREASE',
      title: 'Ayan mall reduced a price',
      detail: 'Shoulder bag went from PKR 2,000 to PKR 1,800 (-10.0%).',
    },
  ],
  priceBand: {
    min: 800,
    max: 3200,
    median: 1800,
    currency: 'PKR',
    sampleSize: 8,
  },
  likes: [{ theme: 'design', count: 6 }],
  complaints: [{ theme: 'delivery', count: 4 }],
};

describe('briefing helpers', () => {
  it('builds a prompt that only includes supplied facts', () => {
    const prompt = buildBriefingUserPrompt(facts);
    expect(prompt).toContain('Bag store');
    expect(prompt).toContain('Captured prices: 8');
    expect(prompt).toContain('Shoulder bag went from PKR 2,000 to PKR 1,800');
    expect(prompt).not.toContain('invent');
    expect(BRIEFING_SYSTEM_PROMPT).toContain('Never invent prices');
  });

  it('parses JSON even when wrapped in a markdown fence', () => {
    const parsed = parseBriefingJson(`
\`\`\`json
{"headline":"Rivals cut bag prices","bullets":["Ayan mall dropped a shoulder bag 10%"],"risks":["Delivery complaints"],"nextActions":["Match the 1800 PKR price if margins allow"]}
\`\`\`
`);
    expect(parsed).toEqual({
      headline: 'Rivals cut bag prices',
      bullets: ['Ayan mall dropped a shoulder bag 10%'],
      risks: ['Delivery complaints'],
      nextActions: ['Match the 1800 PKR price if margins allow'],
    });
  });

  it('parses Gemini aliases and ignores thought text', () => {
    const parsed = parseBriefingJson(`
thinking { "ignore": true }
{"title":"Rivals are quiet","points":["Only 1 competitor is tracked"],"next_actions":["Capture prices"]}
`);
    expect(parsed).toEqual({
      headline: 'Rivals are quiet',
      bullets: ['Only 1 competitor is tracked'],
      risks: [],
      nextActions: ['Capture prices'],
    });
  });

  it('rejects empty or invalid Claude output', () => {
    expect(parseBriefingJson('sorry, I cannot help')).toBeNull();
    expect(parseBriefingJson('{"headline":"","bullets":[]}')).toBeNull();
  });

  it('falls back to captured findings without inventing prices', () => {
    const briefing = fallbackBriefing(facts, 'Claude is unavailable.');
    expect(briefing.source).toBe('fallback');
    expect(briefing.available).toBe(true);
    expect(briefing.bullets.some((item) => item.includes('PKR 1,800'))).toBe(
      true,
    );
    expect(briefing.message).toContain('unavailable');
  });

  it('returns an empty-state briefing when nothing is captured', () => {
    const briefing = fallbackBriefing(
      {
        competitorCount: 0,
        productCount: 0,
        capturedProductCount: 0,
        reviewCount: 0,
        findings: [],
        priceBand: null,
        likes: [],
        complaints: [],
      },
      'Add competitors first.',
    );
    expect(briefing.available).toBe(false);
    expect(briefing.bullets).toEqual([]);
    expect(briefing.nextActions[0]).toMatch(/Add competitor/i);
  });
});
