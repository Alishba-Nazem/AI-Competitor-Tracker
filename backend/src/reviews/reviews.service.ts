import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { analyzeReviews, summarizeReviews } from './review-analysis.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: number) {
    await this.ensureProduct(productId);
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      orderBy: [{ reviewDate: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return reviews.map(serializeReview);
  }

  async findByCompetitor(competitorId: number) {
    const competitor = await this.prisma.competitor.findUnique({
      where: { id: competitorId },
      include: { products: { orderBy: { id: 'asc' } } },
    });
    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    const productIds = competitor.products.map((product) => product.id);
    const allReviews =
      productIds.length === 0
        ? []
        : await this.prisma.review.findMany({
            where: { productId: { in: productIds } },
          });

    const reviewsByProduct = new Map<number, typeof allReviews>();
    for (const review of allReviews) {
      const bucket = reviewsByProduct.get(review.productId) ?? [];
      bucket.push(review);
      reviewsByProduct.set(review.productId, bucket);
    }

    const products = competitor.products.map((product) => {
      const reviews = reviewsByProduct.get(product.id) ?? [];
      const summary = summarizeReviews(
        product.id,
        product.reviewsAvailable !== false,
        product.reviewSource,
        reviews.map((review) => ({
          text: review.text,
          rating: review.rating ? Number(review.rating) : null,
        })),
      );
      return {
        ...summary,
        name: product.name,
        url: product.url,
        currentPrice: product.currentPrice,
        currency: product.currency,
        reviewsAvailable: product.reviewsAvailable,
        reviewSource: product.reviewSource,
      };
    });

    return { competitorId, products };
  }

  async summaryForProduct(productId: number) {
    const product = await this.ensureProduct(productId);
    const reviews = await this.prisma.review.findMany({ where: { productId } });
    return summarizeReviews(
      productId,
      product.reviewsAvailable !== false,
      product.reviewSource,
      reviews.map((review) => ({
        text: review.text,
        rating: review.rating ? Number(review.rating) : null,
      })),
    );
  }

  async insightsForProduct(productId: number) {
    const product = await this.ensureProduct(productId);
    if (product.reviewsAvailable === false) {
      return {
        productId,
        enoughData: false,
        message: "Reviews aren't publicly available for this product.",
        likes: [],
        dislikes: [],
        themes: [],
        complaints: [],
      };
    }
    const reviews = await this.prisma.review.findMany({ where: { productId } });
    if (reviews.length === 0) {
      return {
        productId,
        enoughData: false,
        message: 'No customer reviews found.',
        likes: [],
        dislikes: [],
        themes: [],
        complaints: [],
      };
    }
    return analyzeReviews(
      productId,
      reviews.map((review) => ({
        text: review.text,
        rating: review.rating ? Number(review.rating) : null,
      })),
    );
  }

  private async ensureProduct(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }
}

function serializeReview(review: {
  id: number;
  productId: number;
  externalId: string;
  rating: { toNumber(): number } | number | null;
  text: string;
  reviewDate: Date | null;
  source: string;
  createdAt: Date;
}) {
  return {
    id: review.id,
    productId: review.productId,
    externalId: review.externalId,
    rating:
      review.rating == null
        ? null
        : typeof review.rating === 'number'
          ? review.rating
          : review.rating.toNumber(),
    text: review.text,
    reviewDate: review.reviewDate,
    source: review.source,
    createdAt: review.createdAt,
  };
}
