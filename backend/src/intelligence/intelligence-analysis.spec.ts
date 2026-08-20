import { analyzeReviews } from '../reviews/review-analysis.service';
import {
  buildMarketAnalysis,
  buildOpportunities,
  priceBandFromPrices,
} from './intelligence-analysis';

describe('intelligence analysis', () => {
  it('builds a price band from captured selling prices', () => {
    expect(priceBandFromPrices([1500, 1800, 2000], 'PKR')).toEqual({
      min: 1500,
      max: 2000,
      median: 1800,
      currency: 'PKR',
      sampleSize: 3,
    });
  });

  it('does not invent a market gap without enough reviews', () => {
    const market = buildMarketAnalysis({
      category: 'Women bag',
      reviews: [
        { text: 'Poor quality strap', rating: 1 },
        { text: 'Nice design', rating: 5 },
      ],
      prices: [1500, 1800],
      currency: 'PKR',
      competitorCount: 2,
    });

    expect(market.enoughData).toBe(false);
    expect(market.opportunities).toEqual([]);
    expect(market.message).toMatch(/Not enough review data/);
  });

  it('surfaces a quality and strap gap from stored reviews and price range', () => {
    const reviews = [
      { text: 'Poor quality and short strap', rating: 1 },
      { text: 'Cheap quality, strap broke', rating: 1 },
      { text: 'Quality is bad and strap is short', rating: 2 },
      { text: 'Flimsy quality, adjustable strap needed', rating: 1 },
      { text: 'Great design and colour', rating: 5 },
      { text: 'Beautiful look, stylish design', rating: 5 },
      { text: 'Love the design', rating: 4 },
      { text: 'Nice design but poor quality', rating: 2 },
      { text: 'Strap is too short', rating: 1 },
      { text: 'Quality issues on the strap', rating: 2 },
    ];

    const market = buildMarketAnalysis({
      category: 'Women bag',
      reviews,
      prices: [1500, 1700, 1800, 2000],
      currency: 'PKR',
      competitorCount: 2,
    });

    expect(market.enoughData).toBe(true);
    expect(market.reviewCount).toBe(10);
    expect(market.complaints.some((item) => item.theme === 'quality')).toBe(
      true,
    );
    expect(market.complaints.some((item) => item.theme === 'straps')).toBe(
      true,
    );
    expect(market.opportunities[0]?.detail).toMatch(/PKR 1,500–PKR 2,000/);
    expect(market.opportunities[0]?.detail).toMatch(/quality/);
    expect(market.opportunities[0]?.detail).toMatch(/straps/);
  });

  it('requires repeated complaint evidence before creating an opportunity', () => {
    expect(
      buildOpportunities({
        category: 'Women bag',
        priceBand: {
          min: 1500,
          max: 2000,
          median: 1800,
          currency: 'PKR',
          sampleSize: 4,
        },
        complaints: [{ theme: 'quality', count: 1 }],
        likes: [],
        reviewCount: 20,
      }),
    ).toEqual([]);
  });

  it('does not claim customers like the same themes listed as complaints', () => {
    const [opportunity] = buildOpportunities({
      category: 'Bags',
      priceBand: {
        min: 102,
        max: 3229,
        median: 800,
        currency: 'PKR',
        sampleSize: 10,
      },
      complaints: [
        { theme: 'quality', count: 4 },
        { theme: 'delivery', count: 3 },
      ],
      likes: [
        { theme: 'quality', count: 409 },
        { theme: 'delivery', count: 296 },
        { theme: 'design', count: 190 },
      ],
      reviewCount: 1573,
    });

    expect(opportunity.detail).toMatch(/Low-rated reviews complain about quality and delivery/);
    expect(opportunity.detail).toMatch(/also respond well to design/);
    expect(opportunity.detail).not.toMatch(/respond well to quality/);
    expect(opportunity.detail).not.toMatch(/respond well to delivery/);
  });

  it('reuses stored review analysis rather than inventing themes', () => {
    const insights = analyzeReviews(1, [
      { text: 'Poor quality strap', rating: 1 },
      { text: 'Poor quality strap', rating: 1 },
      { text: 'Poor quality strap', rating: 1 },
      { text: 'Great design', rating: 5 },
      { text: 'Great design', rating: 5 },
    ]);
    expect(insights.enoughData).toBe(true);
    expect(insights.dislikes.map((item) => item.theme)).toEqual(
      expect.arrayContaining(['quality', 'straps']),
    );
  });
});
