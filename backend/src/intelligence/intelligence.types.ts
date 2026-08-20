import type { ReviewTheme } from '../reviews/review.types';

export type IntelligenceFindingKind =
  | 'PRICE_DECREASE'
  | 'PRICE_INCREASE'
  | 'NEW_PRODUCT'
  | 'CUSTOMER_LIKE'
  | 'CUSTOMER_COMPLAINT'
  | 'REPEATED_NEED'
  | 'MARKET_GAP';

export type IntelligenceFinding = {
  kind: IntelligenceFindingKind;
  title: string;
  detail: string;
  competitorId?: number;
  competitorName?: string;
  productId?: number;
  productName?: string;
  count?: number;
};

export type MarketOpportunity = {
  title: string;
  detail: string;
  evidenceCount: number;
};

export type PriceBand = {
  min: number;
  max: number;
  median: number;
  currency: string;
  sampleSize: number;
};

export type MarketAnalysis = {
  enoughData: boolean;
  message?: string;
  reviewCount: number;
  competitorCount: number;
  capturedProductCount: number;
  priceBand: PriceBand | null;
  likes: ReviewTheme[];
  complaints: ReviewTheme[];
  repeatedNeeds: ReviewTheme[];
  opportunities: MarketOpportunity[];
};
