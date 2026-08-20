export type ExtractedReview = {
  text: string;
  rating?: number;
  reviewDate?: Date;
  externalId?: string;
};

export type ReviewScrapeResult = {
  available: boolean;
  source: string;
  reason?: string;
  averageRating?: number;
  reviewCount?: number;
  ratingDistribution?: Record<string, number>;
  reviews: ExtractedReview[];
};

export type ReviewTheme = {
  theme: string;
  count: number;
};

export type ReviewInsights = {
  productId: number;
  enoughData: boolean;
  message?: string;
  likes: ReviewTheme[];
  dislikes: ReviewTheme[];
  themes: ReviewTheme[];
  complaints: ReviewTheme[];
};

export type ReviewSummary = {
  productId: number;
  available: boolean;
  source: string | null;
  totalReviews: number;
  averageRating: number | null;
  ratingDistribution: Record<string, number>;
  positivePercent: number | null;
  negativePercent: number | null;
  message?: string;
};
