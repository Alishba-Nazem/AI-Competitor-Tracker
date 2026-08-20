import {
  parseDarazDate,
  parseDarazScore,
  isDarazStarFilled,
  clampDarazRating,
  parseDarazReviewList,
  extractDarazItemId,
} from './daraz-review.adapter';
import { reviewFingerprint } from './fingerprint';
import { analyzeReviews, summarizeReviews } from './review-analysis.service';
import { detectShopifyReviewProvider } from './shopify-review.adapter';

describe('reviewFingerprint', () => {
  it('is stable for the same review content', () => {
    const first = reviewFingerprint({
      productId: 12,
      text: '  Very good bag  ',
      rating: 5,
    });
    const second = reviewFingerprint({
      productId: 12,
      text: 'Very good bag',
      rating: 5,
    });
    expect(first).toBe(second);
    expect(first).toHaveLength(32);
  });

  it('changes when the review text changes', () => {
    expect(
      reviewFingerprint({ productId: 12, text: 'good', rating: 5 }),
    ).not.toBe(reviewFingerprint({ productId: 12, text: 'bad', rating: 5 }));
  });
});

describe('Daraz review parsers', () => {
  it('parses the visible score text', () => {
    expect(parseDarazScore('4.6/5')).toBe(4.6);
  });

  it('parses Daraz review list JSON into stored review text', () => {
    const parsed = parseDarazReviewList({
      success: true,
      model: {
        items: [
          {
            reviewRateId: 82206031836639,
            reviewContent: 'Great service. All original with seal.',
            rating: 5,
            reviewTime: '11 Jun 2026',
          },
          {
            reviewRateId: 2,
            reviewContent: '   ',
            rating: 4,
          },
        ],
        ratings: { average: 4.3, reviewCount: 10 },
        paging: { totalItems: 10, totalPages: 1, currentPage: 1 },
      },
    });
    expect(parsed).toMatchObject({
      available: true,
      source: 'DARAZ',
      averageRating: 4.3,
      reviewCount: 10,
    });
    expect(parsed?.reviews).toEqual([
      {
        text: 'Great service. All original with seal.',
        rating: 5,
        reviewDate: parseDarazDate('11 Jun 2026'),
        externalId: '82206031836639',
      },
    ]);
  });

  it('extracts a Daraz item id from a product URL', () => {
    expect(
      extractDarazItemId(
        'https://www.daraz.pk/products/apple-iphone-17-pro-max-i1958136639.html',
      ),
    ).toBe('1958136639');
  });

  it('parses a public review date', () => {
    const date = parseDarazDate('13 Jun 2024');
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(5);
    expect(date?.getDate()).toBe(13);
  });
});

describe('Shopify review provider detection', () => {
  it('detects Okendo from ColourPop-like HTML', () => {
    expect(
      detectShopifyReviewProvider(
        '<script src="https://cdn-static.okendo.io/reviews-widget-plus/js/okendo-reviews.js"></script>',
      ),
    ).toBe('OKENDO');
  });

  it('returns UNKNOWN when no review app is present', () => {
    expect(
      detectShopifyReviewProvider('<html><body>Product</body></html>'),
    ).toBe('UNKNOWN');
  });
});

describe('review analysis', () => {
  it('does not invent insights when there are too few reviews', () => {
    expect(
      analyzeReviews(12, [
        { text: 'Good quality', rating: 5 },
        { text: 'Nice design', rating: 4 },
      ]),
    ).toMatchObject({
      enoughData: false,
      message: 'Not enough review data for reliable insights.',
      likes: [],
    });
  });

  it('counts likes and themes only from stored review text', () => {
    const insights = analyzeReviews(12, [
      { text: 'Great quality and price', rating: 5 },
      { text: 'Quality is excellent, delivery was fast', rating: 5 },
      { text: 'Poor quality and late delivery', rating: 1 },
      { text: 'Nice design', rating: 4 },
      { text: 'Value for money', rating: 5 },
    ]);
    expect(insights.enoughData).toBe(true);
    expect(insights.likes.some((item) => item.theme === 'quality')).toBe(true);
    expect(insights.dislikes.some((item) => item.theme === 'delivery')).toBe(
      true,
    );
  });

  it('counts a gold star only when the mask is not empty', () => {
    expect(
      isDarazStarFilled('fill: rgb(255, 200, 60)', 'url(#half_100%)'),
    ).toBe(true);
    expect(
      isDarazStarFilled('fill: rgb(255, 200, 60)', 'url(#half_0%)'),
    ).toBe(false);
    expect(clampDarazRating(11)).toBe(5);
    expect(clampDarazRating(0)).toBeUndefined();
  });

  it('reports unavailable products honestly', () => {
    expect(summarizeReviews(9, false, 'SHOPIFY_OKENDO', [])).toMatchObject({
      available: false,
      message: "Reviews aren't publicly available for this product.",
      totalReviews: 0,
    });
  });
});
