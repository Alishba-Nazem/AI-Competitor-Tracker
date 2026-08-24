import { Injectable, NotFoundException } from '@nestjs/common';
import { ownedCompetitorWhere, ownedProductWhere } from '../auth/workspace.service';
import { ChangesService } from '../changes/changes.service';
import { PrismaService } from '../prisma.service';
import { analyzeReviews, type StoredReview } from '../reviews/review-analysis.service';
import {
  BRIEFING_SYSTEM_PROMPT,
  buildBriefingUserPrompt,
  factsFromDashboard,
  fallbackBriefing,
  parseBriefingJson,
  publicLlmFailureMessage,
} from './briefing';
import { ClaudeClient } from './claude.client';
import {
  buildMarketAnalysis,
  formatMoney,
  marketFindings,
} from './intelligence-analysis';
import type {
  IntelligenceFinding,
  MarketAnalysis,
} from './intelligence.types';

@Injectable()
export class IntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly changesService: ChangesService,
    private readonly claude: ClaudeClient,
  ) {}

  async getDashboard(userId: number) {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { userId },
    });
    const competitors = await this.prisma.competitor.findMany({
      where: ownedCompetitorWhere(userId),
      orderBy: { id: 'asc' },
      include: { products: true },
    });
    const reviews = await this.prisma.review.findMany({
      where: { product: ownedProductWhere(userId) },
      include: {
        product: { include: { competitor: true } },
      },
    });

    const capturedPrices = competitors.flatMap((competitor) =>
      competitor.products
        .map((product) => this.toNumber(product.currentPrice))
        .filter((price) => price > 0),
    );
    const currency =
      competitors
        .flatMap((competitor) => competitor.products)
        .find((product) => this.toNumber(product.currentPrice) > 0)
        ?.currency ?? 'PKR';

    const market = buildMarketAnalysis({
      category: profile?.category,
      reviews: reviews.map(toStoredReview),
      prices: capturedPrices,
      currency,
      competitorCount: competitors.length,
    });

    const changeFindings: IntelligenceFinding[] = [];
    const changeResults = await Promise.all(
      competitors.map((competitor) =>
        this.changesService.findByCompetitor(competitor.id).then((result) => ({
          competitor,
          result,
        })),
      ),
    );
    for (const { competitor, result } of changeResults) {
      for (const change of result.changes) {
        const finding = changeToFinding(
          change,
          competitor.id,
          competitor.name,
        );
        if (finding) changeFindings.push(finding);
      }
    }

    const findings = [
      ...changeFindings,
      ...marketFindings(market),
    ].slice(0, 24);

    return {
      profile,
      summary: {
        competitorCount: competitors.length,
        productCount: competitors.reduce(
          (sum, competitor) => sum + competitor.products.length,
          0,
        ),
        capturedProductCount: capturedPrices.length,
        reviewCount: reviews.length,
        findingCount: findings.length,
      },
      findings,
      market,
    };
  }

  async getMarket(userId: number) {
    const dashboard = await this.getDashboard(userId);
    return {
      profile: dashboard.profile,
      market: dashboard.market,
    };
  }

  async getBriefing(userId: number) {
    const dashboard = await this.getDashboard(userId);
    const facts = factsFromDashboard(dashboard);

    if (
      facts.competitorCount === 0 &&
      facts.findings.length === 0 &&
      facts.reviewCount === 0
    ) {
      return fallbackBriefing(
        facts,
        'Add competitors and capture store data first.',
      );
    }

    const provider = this.claude.provider();
    if (!provider) {
      return fallbackBriefing(
        facts,
        'No Gemini or Claude API key is configured. Showing a briefing from captured prices, changes, and reviews only.',
      );
    }

    try {
      const raw = await this.claude.completeJson(
        BRIEFING_SYSTEM_PROMPT,
        buildBriefingUserPrompt(facts),
      );
      const parsed = parseBriefingJson(raw);
      if (!parsed) {
        return fallbackBriefing(
          facts,
          `${provider === 'gemini' ? 'Gemini' : 'Claude'} returned an unreadable briefing. Showing captured findings instead.`,
        );
      }
      return {
        source: provider,
        available: true,
        ...parsed,
      };
    } catch (error) {
      return fallbackBriefing(facts, publicLlmFailureMessage(provider, error));
    }
  }

  async getCompetitor(userId: number, competitorId: number) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, ...ownedCompetitorWhere(userId) },
      include: { products: true },
    });
    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    const reviews = await this.prisma.review.findMany({
      where: { product: { competitorId } },
    });
    const capturedPrices = competitor.products
      .map((product) => this.toNumber(product.currentPrice))
      .filter((price) => price > 0);
    const currency =
      competitor.products.find(
        (product) => this.toNumber(product.currentPrice) > 0,
      )?.currency ?? 'PKR';

    const changes = await this.changesService.findByCompetitor(competitorId);
    const changeFindings = changes.changes
      .map((change) => changeToFinding(change, competitor.id, competitor.name))
      .filter((item): item is IntelligenceFinding => Boolean(item));

    const insights = analyzeReviews(0, reviews.map(toStoredReview));
    const market = buildMarketAnalysis({
      category: (
        await this.prisma.businessProfile.findUnique({ where: { userId } })
      )?.category,
      reviews: reviews.map(toStoredReview),
      prices: capturedPrices,
      currency,
      competitorCount: 1,
    });

    const findings: IntelligenceFinding[] = [
      ...changeFindings,
      ...marketFindings({
        ...market,
        likes: insights.likes,
        complaints: insights.dislikes,
        repeatedNeeds: insights.themes,
      }),
    ];

    return {
      competitor: {
        id: competitor.id,
        name: competitor.name,
        url: competitor.url,
        platform: competitor.platform,
        isActive: competitor.isActive,
      },
      summary: {
        productCount: competitor.products.length,
        capturedProductCount: capturedPrices.length,
        reviewCount: reviews.length,
        averagePrice:
          capturedPrices.length > 0
            ? Number(
                (
                  capturedPrices.reduce((sum, price) => sum + price, 0) /
                  capturedPrices.length
                ).toFixed(2),
              )
            : null,
        currency,
      },
      findings,
      sentiment: market.sentiment,
      likes: insights.likes,
      dislikes: insights.dislikes,
      repeatedNeeds: insights.themes,
      complaints: insights.complaints,
      opportunities: market.opportunities,
      enoughReviewData: insights.enoughData,
      reviewMessage: insights.message,
      changes,
    };
  }

  private toNumber(value: unknown) {
    if (typeof value === 'number') return value;
    if (value && typeof value === 'object' && 'toNumber' in value) {
      return (value as { toNumber(): number }).toNumber();
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}

function toStoredReview(review: {
  text: string;
  rating?: { toNumber(): number } | number | null;
}): StoredReview {
  return {
    text: review.text,
    rating:
      review.rating == null
        ? null
        : typeof review.rating === 'number'
          ? review.rating
          : review.rating.toNumber(),
  };
}

function changeToFinding(
  change: {
    type: string;
    productId: number;
    productName: string;
    previousPrice?: number;
    currentPrice?: number;
    currency: string;
    percentageChange?: number | null;
  },
  competitorId: number,
  competitorName: string,
): IntelligenceFinding | null {
  if (change.type === 'PRICE_DECREASE') {
    return {
      kind: 'PRICE_DECREASE',
      title: `${competitorName} reduced a price`,
      detail: `${change.productName} went from ${formatMoney(change.previousPrice ?? 0, change.currency)} to ${formatMoney(change.currentPrice ?? 0, change.currency)}${percentSuffix(change.percentageChange)}.`,
      competitorId,
      competitorName,
      productId: change.productId,
      productName: change.productName,
    };
  }
  if (change.type === 'PRICE_INCREASE') {
    return {
      kind: 'PRICE_INCREASE',
      title: `${competitorName} increased a price`,
      detail: `${change.productName} went from ${formatMoney(change.previousPrice ?? 0, change.currency)} to ${formatMoney(change.currentPrice ?? 0, change.currency)}${percentSuffix(change.percentageChange)}.`,
      competitorId,
      competitorName,
      productId: change.productId,
      productName: change.productName,
    };
  }
  if (change.type === 'NEW_PRODUCT') {
    return {
      kind: 'NEW_PRODUCT',
      title: `${competitorName} launched a new product`,
      detail: change.productName,
      competitorId,
      competitorName,
      productId: change.productId,
      productName: change.productName,
    };
  }
  return null;
}

function percentSuffix(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return '';
  return ` (${value.toFixed(1)}%)`;
}
