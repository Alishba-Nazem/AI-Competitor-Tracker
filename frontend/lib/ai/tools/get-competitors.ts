import { tool } from "ai";
import { z } from "zod";
import type { ChatTestErrorKind } from "@/lib/ai/chat-test-error";
import { fetchTrackerJson, toTrackerToolError } from "@/lib/chat-context";
import type { Competitor, Product } from "@/lib/types";

export const GET_COMPETITORS_TOOL_NAME = "getCompetitors";

export const getCompetitorsInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Optional competitor name to match (case-insensitive partial match)."),
});

export type GetCompetitorsInput = z.infer<typeof getCompetitorsInputSchema>;

export type CompetitorRecord = {
  id: number;
  name: string;
  url: string;
  platform: string | null;
  isActive: boolean;
  captureFrequency?: string;
  lastCapturedAt: string | null;
  productCount: number;
};

export type GetCompetitorsOutput = {
  queriedAt: string;
  competitorCount: number;
  productCount: number;
  message: string;
  competitors: CompetitorRecord[];
};

export function createGetCompetitorsTool(authorization: string, testError?: ChatTestErrorKind | null) {
  return tool({
    description:
      "List tracked competitors from the database, including the stored name, URL, platform, and product count. Use this when the user asks who they are tracking, the competitor name, store URL, or how many competitors they have.",
    inputSchema: getCompetitorsInputSchema,
    execute: async (input) => executeGetCompetitors(authorization, input, testError),
  });
}

export async function executeGetCompetitors(
  authorization: string,
  input: GetCompetitorsInput = {},
  testError?: ChatTestErrorKind | null,
): Promise<GetCompetitorsOutput> {
  if (testError === "tool") {
    throw new Error("Couldn't retrieve competitor data");
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

  const nameFilter = input.name?.toLowerCase();
  const matched = competitors.filter((competitor) =>
    nameFilter ? competitor.name.toLowerCase().includes(nameFilter) : true,
  );

  const counts = await productCountsByCompetitor(authorization);

  const records: CompetitorRecord[] = matched.map((competitor) => ({
    id: competitor.id,
    name: competitor.name,
    url: competitor.url,
    platform: competitor.platform ?? null,
    isActive: competitor.isActive,
    captureFrequency: competitor.captureFrequency,
    lastCapturedAt: competitor.lastCapturedAt ?? null,
    productCount: counts.get(competitor.id) ?? 0,
  }));

  const productCount = records.reduce((sum, item) => sum + item.productCount, 0);
  const message =
    records.length === 0
      ? nameFilter
        ? "No tracked competitor matched that name."
        : "No competitors are currently being tracked."
      : records.length === 1
        ? `You're currently tracking ${records[0].name}.`
        : `You're currently tracking ${records.length} competitors.`;

  return {
    queriedAt: new Date().toISOString(),
    competitorCount: records.length,
    productCount,
    message,
    competitors: records,
  };
}

async function productCountsByCompetitor(authorization: string) {
  const counts = new Map<number, number>();
  try {
    const products = await fetchTrackerJson<Product[]>("/products", authorization);
    for (const product of products) {
      counts.set(product.competitorId, (counts.get(product.competitorId) ?? 0) + 1);
    }
  } catch {
    return counts;
  }
  return counts;
}
