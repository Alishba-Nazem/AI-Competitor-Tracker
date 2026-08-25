export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type CaptureLog = {
  id: number;
  competitorId: number;
  triggeredBy: string;
  startedAt: string;
  completedAt?: string | null;
  status: "success" | "partial" | "failed" | string;
  productsScraped: number;
  reviewsScraped: number;
  message?: string | null;
};

export type Competitor = {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  platform?: string | null;
  businessProfileId?: number | null;
  captureFrequency?: "DAILY" | "WEEKLY" | string;
  lastCapturedAt?: string | null;
  nextCaptureAt?: string | null;
  latestCapture?: CaptureLog | null;
};

export type DashboardSummary = {
  competitors: number;
  products: number;
  changesThisWeek: number;
  reviews: number;
};

export type ScrapeProgress = {
  competitorId: number;
  total: number;
  done: number;
  active: boolean;
  updatedAt: number;
};

export type BusinessProfile = {
  id: number;
  businessName: string;
  category: string;
  country: string;
  storeUrl?: string | null;
  onboardingCompletedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingStatus = {
  completed: boolean;
  profile: BusinessProfile | null;
};

export type OnboardingDiscoveryResult = {
  competitorId: number;
  name: string;
  url: string;
  platform?: string;
  discovered: number;
  created: number;
  error?: string;
};

export type CompleteOnboardingResult = {
  profile: BusinessProfile;
  competitors: OnboardingDiscoveryResult[];
  totalDiscovered: number;
  totalCreated: number;
};

export type Product = {
  id: number;
  competitorId: number;
  name: string;
  url: string;
  currentPrice: string | number;
  currency: string;
  imageUrl?: string | null;
  availability?: string | null;
  scrapeMethod?: "daraz" | "shopify" | "jsonld" | "unsupported" | string | null;
};

export type Snapshot = {
  id: number;
  competitorId: number;
  createdAt: string;
  competitor?: Competitor;
};

export type SnapshotProduct = {
  id: number;
  snapshotId: number;
  productId: number;
  name: string;
  url: string;
  price: string | number;
  currency: string;
  availability?: string | null;
};

export type ChangeType =
  | "PRICE_INCREASE"
  | "PRICE_DECREASE"
  | "NEW_PRODUCT"
  | "REMOVED_PRODUCT"
  | "AVAILABILITY_CHANGE";

export type DetectedChange = {
  type: ChangeType;
  productId: number;
  productName: string;
  productUrl: string;
  previousPrice?: number;
  currentPrice?: number;
  currency: string;
  priceDifference?: number;
  percentageChange?: number | null;
  previousAvailability?: string;
  currentAvailability?: string;
};

export type ChangeDetectionResult = {
  competitorId: number;
  latestSnapshotId: number | null;
  previousSnapshotId: number | null;
  hasChanges: boolean;
  changes: DetectedChange[];
};

export type ProductPriceHistoryPoint = {
  snapshotId: number;
  competitorId: number;
  capturedAt: string;
  name: string;
  url: string;
  price: number;
  currency: string;
  availability?: string | null;
};

export type ProductPriceHistory = {
  productId: number;
  history: ProductPriceHistoryPoint[];
};

export type CompetitorChangeLogEntry = {
  latestSnapshotId: number;
  previousSnapshotId: number;
  detectedAt: string;
  hasChanges: boolean;
  changes: DetectedChange[];
};

export type CompetitorChangeLog = {
  competitorId: number;
  entries: CompetitorChangeLogEntry[];
};

export type CaptureResult = {
  snapshot: Snapshot;
  competitor: Pick<Competitor, "id" | "name" | "url">;
  capturedProducts: Array<{
    productId: number;
    name: string;
    price: number;
    currency: string;
    availability?: string;
  }>;
  failedProducts: Array<{
    productId: number;
    name: string;
    error: string;
  }>;
};

export type DiscoverResult = {
  competitorId: number;
  platform: "SHOPIFY" | "DARAZ" | "UNKNOWN";
  discovered: number;
  created: number;
  skipped: number;
};

export type ReviewTheme = {
  theme: string;
  count: number;
};

export type ProductReview = {
  id: number;
  productId: number;
  rating: number | null;
  text: string;
  reviewDate: string | null;
  source: string;
  createdAt: string;
};

export type ReviewSummary = {
  productId: number;
  name?: string;
  available: boolean;
  source: string | null;
  totalReviews: number;
  averageRating: number | null;
  ratingDistribution: Record<string, number>;
  positivePercent: number | null;
  negativePercent: number | null;
  message?: string;
  reviewsAvailable?: boolean | null;
  reviewSource?: string | null;
  currentPrice?: string | number;
  currency?: string;
};

export type CompetitorReviews = {
  competitorId: number;
  products: ReviewSummary[];
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

export type IntelligenceFindingKind =
  | "PRICE_DECREASE"
  | "PRICE_INCREASE"
  | "NEW_PRODUCT"
  | "CUSTOMER_LIKE"
  | "CUSTOMER_COMPLAINT"
  | "REPEATED_NEED"
  | "MARKET_GAP";

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

export type ReviewSentiment = {
  rated: number;
  unrated: number;
  positive: number;
  neutral: number;
  negative: number;
  positivePercent: number | null;
  negativePercent: number | null;
  averageRating: number | null;
  ratingDistribution: Record<string, number>;
};

export type MarketAnalysis = {
  enoughData: boolean;
  message?: string;
  reviewCount: number;
  competitorCount: number;
  capturedProductCount: number;
  priceBand: PriceBand | null;
  sentiment: ReviewSentiment;
  likes: ReviewTheme[];
  complaints: ReviewTheme[];
  repeatedNeeds: ReviewTheme[];
  opportunities: MarketOpportunity[];
};

export type IntelligenceBriefing = {
  source: "gemini" | "claude" | "fallback";
  available: boolean;
  headline: string;
  bullets: string[];
  risks: string[];
  nextActions: string[];
  message?: string;
};

export type IntelligenceDashboard = {
  profile: BusinessProfile | null;
  summary: {
    competitorCount: number;
    productCount: number;
    capturedProductCount: number;
    reviewCount: number;
    findingCount: number;
  };
  findings: IntelligenceFinding[];
  market: MarketAnalysis;
};

export type CompetitorIntelligence = {
  competitor: Competitor;
  summary: {
    productCount: number;
    capturedProductCount: number;
    reviewCount: number;
    averagePrice: number | null;
    currency: string;
  };
  findings: IntelligenceFinding[];
  sentiment: ReviewSentiment;
  likes: ReviewTheme[];
  dislikes: ReviewTheme[];
  repeatedNeeds: ReviewTheme[];
  complaints: ReviewTheme[];
  opportunities: MarketOpportunity[];
  enoughReviewData: boolean;
  reviewMessage?: string;
  changes: ChangeDetectionResult;
};

export type NavKey =
  | "dashboard"
  | "competitors"
  | "products"
  | "changes"
  | "reviews"
  | "snapshots"
  | "settings"
  | "assistant";
