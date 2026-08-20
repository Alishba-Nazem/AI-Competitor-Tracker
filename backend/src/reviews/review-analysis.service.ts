import type {
  ReviewInsights,
  ReviewSummary,
  ReviewTheme,
} from './review.types';

const MIN_REVIEWS_FOR_INSIGHTS = 5;

const THEMES: Array<{ theme: string; pattern: RegExp; complaint?: boolean }> = [
  {
    theme: 'quality',
    pattern:
      /quality|material|durable|durability|behtreen|acha product|poor quality|cheap quality|fake|flimsy/i,
    complaint: true,
  },
  {
    theme: 'price/value',
    pattern: /price|value|worth|paisa|hisab|hisaab|expensive|sasta|afford/i,
  },
  {
    theme: 'delivery',
    pattern: /deliver|shipping|parcel|packaging|courier|late|damage/i,
    complaint: true,
  },
  {
    theme: 'design',
    pattern: /design|look|colour|color|style|pretty|beautiful|shape/i,
  },
  { theme: 'battery', pattern: /batter/i, complaint: true },
  {
    theme: 'sizing',
    pattern: /\bsize\b|fitting|too small|too large|sizing/i,
    complaint: true,
  },
  {
    theme: 'straps',
    pattern: /strap|adjustable|shoulder strap/i,
    complaint: true,
  },
  {
    theme: 'stitching',
    pattern: /stitch|zipper|zip\b|lining|tear|torn/i,
    complaint: true,
  },
  {
    theme: 'capacity',
    pattern: /pocket|capacity|space|fits my|roomy/i,
  },
  {
    theme: 'as pictured',
    pattern: /as shown|as pictured|jesa dikhaya|same as|picture/i,
  },
];

export type StoredReview = {
  text: string;
  rating?: number | null;
};

export function summarizeReviews(
  productId: number,
  available: boolean,
  source: string | null,
  reviews: StoredReview[],
): ReviewSummary {
  if (!available) {
    return {
      productId,
      available: false,
      source,
      totalReviews: 0,
      averageRating: null,
      ratingDistribution: emptyDistribution(),
      positivePercent: null,
      negativePercent: null,
      message: "Reviews aren't publicly available for this product.",
    };
  }

  if (reviews.length === 0) {
    return {
      productId,
      available: true,
      source,
      totalReviews: 0,
      averageRating: null,
      ratingDistribution: emptyDistribution(),
      positivePercent: null,
      negativePercent: null,
      message: 'No customer reviews found.',
    };
  }

  const rated = reviews.filter(
    (review) => typeof review.rating === 'number' && review.rating > 0,
  );
  const distribution = emptyDistribution();
  for (const review of rated) {
    const bucket = String(Math.round(Number(review.rating)));
    if (distribution[bucket] !== undefined) distribution[bucket] += 1;
  }
  const averageRating =
    rated.length === 0
      ? null
      : Number(
          (
            rated.reduce((sum, review) => sum + Number(review.rating), 0) /
            rated.length
          ).toFixed(2),
        );
  const positive = rated.filter((review) => Number(review.rating) >= 4).length;
  const negative = rated.filter((review) => Number(review.rating) <= 2).length;

  return {
    productId,
    available: true,
    source,
    totalReviews: reviews.length,
    averageRating,
    ratingDistribution: distribution,
    positivePercent: rated.length
      ? Number(((positive / rated.length) * 100).toFixed(1))
      : null,
    negativePercent: rated.length
      ? Number(((negative / rated.length) * 100).toFixed(1))
      : null,
  };
}

export function analyzeReviews(
  productId: number,
  reviews: StoredReview[],
): ReviewInsights {
  if (reviews.length < MIN_REVIEWS_FOR_INSIGHTS) {
    return {
      productId,
      enoughData: false,
      message: 'Not enough review data for reliable insights.',
      likes: [],
      dislikes: [],
      themes: [],
      complaints: [],
    };
  }

  const likes = new Map<string, number>();
  const dislikes = new Map<string, number>();
  const themes = new Map<string, number>();
  const complaints = new Map<string, number>();

  for (const review of reviews) {
    const rating =
      typeof review.rating === 'number' ? Number(review.rating) : undefined;
    for (const item of THEMES) {
      if (!item.pattern.test(review.text)) continue;
      themes.set(item.theme, (themes.get(item.theme) ?? 0) + 1);
      if (rating !== undefined && rating >= 4) {
        likes.set(item.theme, (likes.get(item.theme) ?? 0) + 1);
      }
      if (rating !== undefined && rating <= 2) {
        dislikes.set(item.theme, (dislikes.get(item.theme) ?? 0) + 1);
        if (item.complaint) {
          complaints.set(item.theme, (complaints.get(item.theme) ?? 0) + 1);
        }
      }
    }
  }

  return {
    productId,
    enoughData: true,
    likes: toThemes(likes),
    dislikes: toThemes(dislikes),
    themes: toThemes(themes),
    complaints: toThemes(complaints),
  };
}

function toThemes(counts: Map<string, number>): ReviewTheme[] {
  return [...counts.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
}

function emptyDistribution() {
  return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
}
