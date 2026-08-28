import { tool } from "ai";
import { z } from "zod";
import type { ChatTestErrorKind } from "@/lib/ai/chat-test-error";
import { fetchTrackerJson, toTrackerToolError } from "@/lib/chat-context";
import type { ChangeDetectionResult, ChangeType, Competitor, DetectedChange, Product } from "@/lib/types";

export const QUERY_COMPETITOR_DATA_TOOL_NAME = "queryCompetitorData";

const CHANGE_TYPES = [
  "PRICE_INCREASE",
  "PRICE_DECREASE",
  "NEW_PRODUCT",
  "REMOVED_PRODUCT",
  "AVAILABILITY_CHANGE",
] as const;

export const queryCompetitorDataInputSchema = z.object({
  competitorName: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Optional competitor name to match (case-insensitive partial match)."),
  productName: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Optional product name to match (case-insensitive partial match)."),
  changeType: z
    .enum([...CHANGE_TYPES, "ALL"])
    .optional()
    .describe(
      "Kind of captured change to return. Use PRICE_DECREASE or PRICE_INCREASE for price moves. ALL returns every detected change type. Omit when the user wants current prices rather than diffs.",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Maximum number of changes and products to return. Defaults to 10."),
});

export type QueryCompetitorDataInput = z.infer<typeof queryCompetitorDataInputSchema>;

export type QueryCompetitorDataStatus =
  | "changes"
  | "stable"
  | "no_products"
  | "no_competitors"
  | "no_match";

export type CompetitorDataChange = {
  competitorId: number;
  competitor: string;
  productId: number;
  product: string;
  productUrl: string;
  detectedChange: ChangeType;
  previousPrice?: number;
  currentPrice?: number;
  priceChange?: number;
  changePercentage?: number | null;
  currency: string;
  availability?: string;
  previousAvailability?: string;
  currentAvailability?: string;
};

export type CompetitorProductRow = {
  competitorId: number;
  competitor: string;
  productId: number;
  product: string;
  productUrl: string;
  currentPrice: number;
  currency: string;
  availability?: string;
};

export type QueryPriceSummary = {
  min: number;
  median: number;
  max: number;
  currency: string;
  sampleSize: number;
};

export type QueryCompetitorDataOutput = {
  queriedAt: string;
  status: QueryCompetitorDataStatus;
  competitorCount: number;
  productCount: number;
  changeCount: number;
  hasChanges: boolean;
  message: string;
  priceSummary: QueryPriceSummary | null;
  products: CompetitorProductRow[];
  changes: CompetitorDataChange[];
};

const MAX_COMPETITORS = 12;
const DEFAULT_LIMIT = 10;

export function createQueryCompetitorDataTool(
  authorization: string,
  testError?: ChatTestErrorKind | null,
) {
  return tool({
    description:
      "Query captured competitor products, current prices, and snapshot diffs from the tracker. Use this for current price comparisons, cheapest/most expensive products, and whether prices or catalog items changed. Zero changes with existing products is a valid stable catalog, not an empty result. Do not invent prices.",
    inputSchema: queryCompetitorDataInputSchema,
    execute: async (input) => executeQueryCompetitorData(authorization, input, testError),
  });
}

export async function executeQueryCompetitorData(
  authorization: string,
  input: QueryCompetitorDataInput,
  testError?: ChatTestErrorKind | null,
): Promise<QueryCompetitorDataOutput> {
  if (testError === "tool") {
    throw new Error("Couldn't retrieve competitor data");
  }
  if (testError === "empty") {
    return emptyResult("no_match", "No matching competitor data found.");
  }

  if (!authorization.trim()) {
    throw new Error("Couldn't retrieve competitor data");
  }

  let competitors: Competitor[];
  try {
    competitors = await fetchTrackerJson<Competitor[]>("/competitors", authorization);
  } catch (error) {
    throw toTrackerToolError(error);
  }

  const nameFilter = input.competitorName?.toLowerCase();
  const matched = competitors
    .filter((competitor) => (nameFilter ? competitor.name.toLowerCase().includes(nameFilter) : true))
    .slice(0, MAX_COMPETITORS);

  if (matched.length === 0) {
    return emptyResult(
      nameFilter ? "no_match" : "no_competitors",
      nameFilter ? "No tracked competitor matched that name." : "No competitors are currently being tracked.",
    );
  }

  const matchedIds = new Set(matched.map((competitor) => competitor.id));
  const byId = new Map(matched.map((competitor) => [competitor.id, competitor]));

  const [catalog, changeResults] = await Promise.all([
    loadMatchedProducts(authorization, matchedIds),
    Promise.allSettled(
      matched.map((competitor) =>
        fetchTrackerJson<ChangeDetectionResult>(`/changes/competitor/${competitor.id}`, authorization),
      ),
    ),
  ]);

  const pairs: Array<{ competitor: Competitor; detection: ChangeDetectionResult }> = [];
  changeResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      pairs.push({ competitor: matched[index], detection: result.value });
    }
  });
  if (pairs.length === 0 && catalog.status === "error") {
    throw new Error("Couldn't retrieve competitor data");
  }

  const productFilter = input.productName?.toLowerCase();
  const wantedType = !input.changeType || input.changeType === "ALL" ? null : input.changeType;
  const limit = input.limit ?? DEFAULT_LIMIT;

  const products = catalog.products
    .filter((product) => matchedIds.has(product.competitorId))
    .map((product) => toProductRow(byId.get(product.competitorId), product))
    .filter((row): row is CompetitorProductRow => Boolean(row))
    .filter((row) => (productFilter ? row.product.toLowerCase().includes(productFilter) : true))
    .sort((left, right) => left.currentPrice - right.currentPrice);

  const changes = pairs
    .flatMap(({ competitor, detection }) =>
      detection.changes.map((change) => toCompetitorDataChange(competitor, change)),
    )
    .filter((change) => (wantedType ? change.detectedChange === wantedType : true))
    .filter((change) => (productFilter ? change.product.toLowerCase().includes(productFilter) : true))
    .sort(sortByMagnitude)
    .slice(0, limit);

  if (productFilter && products.length === 0 && changes.length === 0) {
    return emptyResult("no_match", "No captured products matched that name.", matched.length);
  }

  if (catalog.status === "ok" && products.length === 0 && changes.length === 0) {
    return emptyResult("no_products", "No competitor products have been captured yet.", matched.length);
  }

  const priceSummary = summarizePrices(products);
  const listedProducts = products.slice(0, limit);
  const status: QueryCompetitorDataStatus = changes.length > 0 ? "changes" : "stable";
  const message =
    status === "changes"
      ? `Found ${changes.length} captured change${changes.length === 1 ? "" : "s"} from the latest snapshot comparison.`
      : `I found ${products.length} captured competitor product${products.length === 1 ? "" : "s"}, but no price changes were detected in the latest snapshot comparison.`;

  return {
    queriedAt: new Date().toISOString(),
    status,
    competitorCount: matched.length,
    productCount: products.length,
    changeCount: changes.length,
    hasChanges: changes.length > 0,
    message,
    priceSummary,
    products: listedProducts,
    changes,
  };
}

function emptyResult(
  status: QueryCompetitorDataStatus,
  message: string,
  competitorCount = 0,
): QueryCompetitorDataOutput {
  return {
    queriedAt: new Date().toISOString(),
    status,
    competitorCount,
    productCount: 0,
    changeCount: 0,
    hasChanges: false,
    message,
    priceSummary: null,
    products: [],
    changes: [],
  };
}

async function loadMatchedProducts(authorization: string, matchedIds: Set<number>) {
  try {
    const products = await fetchTrackerJson<Product[]>("/products", authorization);
    return {
      status: "ok" as const,
      products: products.filter((product) => matchedIds.has(product.competitorId)),
    };
  } catch {
    return { status: "error" as const, products: [] as Product[] };
  }
}

function toProductRow(competitor: Competitor | undefined, product: Product): CompetitorProductRow | null {
  if (!competitor) return null;
  const currentPrice = toPrice(product.currentPrice);
  if (currentPrice === undefined) return null;
  return {
    competitorId: competitor.id,
    competitor: competitor.name,
    productId: product.id,
    product: product.name,
    productUrl: product.url,
    currentPrice,
    currency: product.currency,
    availability: product.availability ?? undefined,
  };
}

export function toPrice(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function summarizePrices(products: CompetitorProductRow[]): QueryPriceSummary | null {
  const prices = products.map((product) => product.currentPrice).filter((price) => price > 0).sort((a, b) => a - b);
  if (prices.length === 0) return null;
  const middle = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 1 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2;
  return {
    min: prices[0],
    median,
    max: prices[prices.length - 1],
    currency: products[0]?.currency || "PKR",
    sampleSize: prices.length,
  };
}

function toCompetitorDataChange(competitor: Competitor, change: DetectedChange): CompetitorDataChange {
  return {
    competitorId: competitor.id,
    competitor: competitor.name,
    productId: change.productId,
    product: change.productName,
    productUrl: change.productUrl,
    detectedChange: change.type,
    previousPrice: change.previousPrice,
    currentPrice: change.currentPrice,
    priceChange: change.priceDifference,
    changePercentage: change.percentageChange,
    currency: change.currency,
    availability: change.currentAvailability,
    previousAvailability: change.previousAvailability,
    currentAvailability: change.currentAvailability,
  };
}

function sortByMagnitude(left: CompetitorDataChange, right: CompetitorDataChange) {
  return Math.abs(right.changePercentage ?? 0) - Math.abs(left.changePercentage ?? 0);
}
