import { analyzeReviews, type StoredReview } from '../reviews/review-analysis.service';
import type {
  IntelligenceFinding,
  MarketAnalysis,
  MarketOpportunity,
  PriceBand,
  ReviewSentiment,
} from './intelligence.types';

const MIN_MARKET_REVIEWS = 8;
const MIN_THEME_EVIDENCE = 3;

export function priceBandFromPrices(
  prices: number[],
  currency: string,
): PriceBand | null {
  const valid = prices.filter((price) => Number.isFinite(price) && price > 0);
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
      : sorted[mid];
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median,
    currency,
    sampleSize: sorted.length,
  };
}

export function formatMoney(amount: number, currency: string) {
  return `${currency} ${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatPriceBand(band: PriceBand) {
  if (band.min === band.max) {
    return formatMoney(band.min, band.currency);
  }
  return `${formatMoney(band.min, band.currency)}–${formatMoney(band.max, band.currency)}`;
}

export function sentimentFromReviews(reviews: StoredReview[]): ReviewSentiment {
  const ratingDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let rated = 0;
  let ratingTotal = 0;
  let positive = 0;
  let neutral = 0;
  let negative = 0;

  for (const review of reviews) {
    const rating = Number(review.rating);
    if (!Number.isFinite(rating) || rating <= 0) continue;

    rated += 1;
    ratingTotal += rating;
    const bucket = String(
      Math.min(5, Math.max(1, Math.round(rating))),
    ) as keyof typeof ratingDistribution;
    ratingDistribution[bucket] += 1;

    if (rating >= 4) positive += 1;
    else if (rating <= 2) negative += 1;
    else neutral += 1;
  }

  return {
    rated,
    unrated: reviews.length - rated,
    positive,
    neutral,
    negative,
    positivePercent: rated ? Number(((positive / rated) * 100).toFixed(1)) : null,
    negativePercent: rated ? Number(((negative / rated) * 100).toFixed(1)) : null,
    averageRating: rated ? Number((ratingTotal / rated).toFixed(2)) : null,
    ratingDistribution,
  };
}

export function buildMarketAnalysis(input: {
  category?: string | null;
  reviews: StoredReview[];
  prices: number[];
  currency: string;
  competitorCount: number;
}): MarketAnalysis {
  const reviewCount = input.reviews.length;
  const priceBand = priceBandFromPrices(input.prices, input.currency);
  const sentiment = sentimentFromReviews(input.reviews);
  const insights = analyzeReviews(0, input.reviews);
  const likes = insights.likes.slice(0, 5);
  const complaints = insights.dislikes.slice(0, 5);
  const repeatedNeeds = insights.themes.slice(0, 5);

  if (reviewCount < MIN_MARKET_REVIEWS) {
    return {
      enoughData: false,
      message:
        reviewCount === 0
          ? 'Capture competitor reviews to see what customers like, dislike, and where gaps exist.'
          : `Not enough review data yet (${reviewCount} stored). Capture more public reviews before treating this as a market finding.`,
      reviewCount,
      competitorCount: input.competitorCount,
      capturedProductCount: input.prices.length,
      priceBand,
      sentiment,
      likes,
      complaints,
      repeatedNeeds,
      opportunities: [],
    };
  }

  return {
    enoughData: true,
    reviewCount,
    competitorCount: input.competitorCount,
    capturedProductCount: input.prices.length,
    priceBand,
    sentiment,
    likes,
    complaints,
    repeatedNeeds,
    opportunities: buildOpportunities({
      category: input.category,
      priceBand,
      complaints,
      likes,
      reviewCount,
    }),
  };
}

export function marketFindings(market: MarketAnalysis): IntelligenceFinding[] {
  const findings: IntelligenceFinding[] = [];

  for (const like of market.likes.slice(0, 3)) {
    findings.push({
      kind: 'CUSTOMER_LIKE',
      title: `Customers respond well to ${like.theme}`,
      detail: `${like.count} stored review${like.count === 1 ? '' : 's'} mention ${like.theme} positively.`,
      count: like.count,
    });
  }

  for (const complaint of market.complaints.slice(0, 3)) {
    findings.push({
      kind: 'CUSTOMER_COMPLAINT',
      title: `Customers complain about ${complaint.theme}`,
      detail: `${complaint.count} low-rated review${complaint.count === 1 ? '' : 's'} mention ${complaint.theme}.`,
      count: complaint.count,
    });
  }

  for (const need of market.repeatedNeeds.slice(0, 3)) {
    findings.push({
      kind: 'REPEATED_NEED',
      title: `Repeated customer need: ${need.theme}`,
      detail: `${need.count} review${need.count === 1 ? '' : 's'} across competitors mention ${need.theme}.`,
      count: need.count,
    });
  }

  for (const opportunity of market.opportunities) {
    findings.push({
      kind: 'MARKET_GAP',
      title: opportunity.title,
      detail: opportunity.detail,
      count: opportunity.evidenceCount,
    });
  }

  return findings;
}

export function buildOpportunities(input: {
  category?: string | null;
  priceBand: PriceBand | null;
  complaints: Array<{ theme: string; count: number }>;
  likes: Array<{ theme: string; count: number }>;
  reviewCount: number;
}): MarketOpportunity[] {
  const strongComplaints = input.complaints.filter(
    (item) => item.count >= MIN_THEME_EVIDENCE,
  );
  if (strongComplaints.length === 0) {
    return [];
  }

  const complaintThemes = new Set(strongComplaints.map((item) => item.theme));
  // Don't say customers "respond well" to the same themes we're calling complaints.
  const positiveLikes = input.likes.filter(
    (item) => !complaintThemes.has(item.theme),
  );

  const niche = input.category?.trim() || 'this category';
  const priceText = input.priceBand
    ? `Competitor products with captured prices are mostly ${formatPriceBand(input.priceBand)}.`
    : 'Competitor selling prices are not captured yet.';
  const complaintText = joinThemes(strongComplaints.slice(0, 2));
  const likeText =
    positiveLikes.length > 0
      ? ` Customers also respond well to ${joinThemes(positiveLikes.slice(0, 2))}.`
      : '';

  return [
    {
      title: `Gap in ${niche}: address ${complaintText}`,
      detail: `${input.reviewCount} stored reviews were analyzed. Low-rated reviews complain about ${complaintText}. ${priceText}${likeText} Opportunity: a better-specified product in this range that reduces those complaints.`,
      evidenceCount: strongComplaints.reduce((sum, item) => sum + item.count, 0),
    },
  ];
}

function joinThemes(items: Array<{ theme: string; count: number }>) {
  const names = items.map((item) => item.theme);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}
