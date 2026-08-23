import { getAuthToken } from "./auth";
import type {
  AuthResponse,
  AuthUser,
  BusinessProfile,
  CaptureResult,
  CompetitorChangeLog,
  ChangeDetectionResult,
  CompleteOnboardingResult,
  Competitor,
  CompetitorIntelligence,
  CompetitorReviews,
  DashboardSummary,
  DiscoverResult,
  IntelligenceBriefing,
  IntelligenceDashboard,
  OnboardingStatus,
  Product,
  ProductPriceHistory,
  ProductReview,
  ReviewInsights,
  ReviewSummary,
  ScrapeProgress,
  Snapshot,
  SnapshotProduct,
} from "./types";

export const API_BASE_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return "http://localhost:3000";
})();

export async function getErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) return payload.message.join(", ");
    if (typeof payload.message === "string") return payload.message;
    return fallback;
  } catch {
    return fallback;
  }
}

async function request<T>(path: string, init?: RequestInit, fallback = "Request failed."): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  let response: Response;
  try {
    const token = typeof window !== "undefined" ? getAuthToken() : null;
    response = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    const isLocalFallback = /localhost|127\.0\.0\.1/.test(API_BASE_URL);
    throw new Error(
      isLocalFallback
        ? "Failed to reach the API. Set NEXT_PUBLIC_API_BASE_URL in Vercel to your Railway backend URL (no trailing slash), then redeploy."
        : `Failed to fetch ${url}. Check the Railway backend URL and that FRONTEND_URL on Railway matches this Vercel domain.`,
    );
  }
  if (!response.ok) {
    if (response.status === 404 && /localhost:3000/.test(url)) {
      throw new Error(
        "The frontend sent this request to itself, not the API. Open http://localhost:3001 and keep the backend on port 3000.",
      );
    }
    throw new Error(await getErrorMessage(response, fallback));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  signup: (body: { name: string; email: string; password: string }) =>
    request<AuthResponse>(
      "/auth/signup",
      { method: "POST", body: JSON.stringify(body) },
      "Unable to create account.",
    ),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(body) },
      "Unable to sign in.",
    ),
  getCurrentUser: () =>
    request<AuthUser>("/auth/me", undefined, "Unable to verify session."),
  getOnboardingStatus: () =>
    request<OnboardingStatus>("/onboarding/status", undefined, "Failed to load onboarding status."),
  getBusinessProfile: () =>
    request<BusinessProfile | null>("/onboarding/profile", undefined, "Failed to load business profile."),
  getDashboardSummary: () =>
    request<DashboardSummary>("/dashboard/summary", undefined, "Failed to load dashboard summary."),
  getScrapeProgress: (competitorId: number) =>
    request<ScrapeProgress>(
      `/scrape-progress/${competitorId}`,
      undefined,
      "Failed to load scrape progress.",
    ),
  updateCompetitor: (id: number, body: { name?: string; url?: string; isActive?: boolean; captureFrequency?: "DAILY" | "WEEKLY" }) =>
    request<Competitor>(
      `/competitors/${id}`,
      { method: "PATCH", body: JSON.stringify(body) },
      "Unable to update competitor.",
    ),
  completeOnboarding: (body: {
    businessName: string;
    category: string;
    country: string;
    storeUrl?: string;
    competitors: Array<{ url: string; name?: string }>;
  }) =>
    request<CompleteOnboardingResult>(
      "/onboarding/complete",
      { method: "POST", body: JSON.stringify(body) },
      "Unable to complete onboarding.",
    ),
  resetOnboarding: () =>
    request<{ reset: boolean; completed: boolean; message: string }>(
      "/onboarding/reset",
      { method: "POST" },
      "Unable to reset onboarding.",
    ),
  getIntelligenceDashboard: () =>
    request<IntelligenceDashboard>(
      "/intelligence/dashboard",
      undefined,
      "Failed to load research findings.",
    ),
  getIntelligenceBriefing: () =>
    request<IntelligenceBriefing>(
      "/intelligence/briefing",
      undefined,
      "Failed to load AI briefing.",
    ),
  getCompetitorIntelligence: (competitorId: number) =>
    request<CompetitorIntelligence>(
      `/intelligence/competitor/${competitorId}`,
      undefined,
      "Failed to load competitor insights.",
    ),

  getCompetitors: () => request<Competitor[]>("/competitors", undefined, "Failed to load competitors."),
  getCompetitor: (id: number) =>
    request<Competitor>(`/competitors/${id}`, undefined, "Failed to load competitor."),
  createCompetitor: (body: { name: string; url: string }) =>
    request<Competitor>(
      "/competitors",
      { method: "POST", body: JSON.stringify(body) },
      "Unable to add competitor.",
    ),
  deleteCompetitor: (id: number) =>
    request<Competitor>(`/competitors/${id}`, { method: "DELETE" }, "Unable to delete competitor."),

  getProducts: (competitorId?: number) =>
    request<Product[]>(
      competitorId ? `/products?competitorId=${competitorId}` : "/products",
      undefined,
      "Failed to load products.",
    ),
  createProduct: (body: {
    competitorId: number;
    name: string;
    url: string;
    currentPrice: number;
    currency: string;
  }) =>
    request<Product>(
      "/products",
      { method: "POST", body: JSON.stringify(body) },
      "Unable to add product.",
    ),
  deleteProduct: (id: number) =>
    request<Product>(`/products/${id}`, { method: "DELETE" }, "Unable to delete product."),

  getSnapshots: () => request<Snapshot[]>("/snapshots", undefined, "Failed to load snapshots."),
  getSnapshotsByCompetitor: (competitorId: number) =>
    request<Snapshot[]>(
      `/snapshots/competitor/${competitorId}`,
      undefined,
      "Failed to load snapshots.",
    ),
  getSnapshotProducts: (snapshotId: number) =>
    request<SnapshotProduct[]>(
      `/snapshot-products?snapshotId=${snapshotId}`,
      undefined,
      "Failed to load snapshot products.",
    ),

  getChanges: (competitorId: number) =>
    request<ChangeDetectionResult>(
      `/changes/competitor/${competitorId}`,
      undefined,
      "Failed to load changes.",
    ),
  getCompetitorChangeLog: (competitorId: number) =>
    request<CompetitorChangeLog>(
      `/changes/competitor/${competitorId}/log`,
      undefined,
      "Failed to load historical changes.",
    ),
  getProductPriceHistory: (productId: number) =>
    request<ProductPriceHistory>(
      `/changes/product/${productId}/history`,
      undefined,
      "Failed to load price history.",
    ),

  captureCompetitor: (competitorId: number) =>
    request<CaptureResult>(
      `/scraper/competitor/${competitorId}`,
      { method: "POST" },
      "Unable to capture product prices.",
    ),
  discoverCompetitor: (competitorId: number) =>
    request<DiscoverResult>(
      `/scraper/competitor/${competitorId}/discover`,
      { method: "POST" },
      "Unable to discover products from this store URL.",
    ),
  getCompetitorReviews: (competitorId: number) =>
    request<CompetitorReviews>(
      `/reviews/competitor/${competitorId}`,
      undefined,
      "Failed to load reviews.",
    ),
  getProductReviews: (productId: number) =>
    request<ProductReview[]>(`/reviews/product/${productId}`, undefined, "Failed to load reviews."),
  getProductReviewSummary: (productId: number) =>
    request<ReviewSummary>(
      `/reviews/product/${productId}/summary`,
      undefined,
      "Failed to load review summary.",
    ),
  getProductReviewInsights: (productId: number) =>
    request<ReviewInsights>(
      `/reviews/product/${productId}/insights`,
      undefined,
      "Failed to load review insights.",
    ),
  captureProductReviews: (productId: number) =>
    request<{ extracted: number; created: number; skipped: number; available: boolean; reason?: string }>(
      `/reviews/product/${productId}/capture`,
      { method: "POST" },
      "Unable to capture reviews.",
    ),
  captureCompetitorReviews: (competitorId: number) =>
    request<{ processed: number; created: number }>(
      `/reviews/competitor/${competitorId}/capture`,
      { method: "POST" },
      "Unable to capture reviews.",
    ),
};
