import {
  BadGatewayException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DiscoveryService } from '../scraper/discovery.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

export type OnboardingDiscoveryResult = {
  competitorId: number;
  name: string;
  url: string;
  platform?: string;
  discovered: number;
  created: number;
  error?: string;
};

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  async getStatus() {
    const profile = await this.prisma.businessProfile.findFirst({
      orderBy: { id: 'asc' },
    });
    return {
      completed: Boolean(profile),
      profile,
    };
  }

  async getProfile() {
    return this.prisma.businessProfile.findFirst({
      orderBy: { id: 'asc' },
      include: {
        competitors: {
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  /** Clears demo data so onboarding can be shown again. */
  async reset() {
    await this.prisma.$transaction([
      this.prisma.captureLog.deleteMany(),
      this.prisma.review.deleteMany(),
      this.prisma.snapshotProduct.deleteMany(),
      this.prisma.snapshot.deleteMany(),
      this.prisma.product.deleteMany(),
      this.prisma.competitor.deleteMany(),
      this.prisma.businessProfile.deleteMany(),
    ]);

    return {
      reset: true,
      completed: false,
      message: 'Tracker data cleared. Onboarding is available again.',
    };
  }

  async complete(dto: CompleteOnboardingDto) {
    const existing = await this.prisma.businessProfile.findFirst();
    if (existing) {
      throw new ConflictException('Onboarding has already been completed.');
    }

    const profile = await this.prisma.businessProfile.create({
      data: {
        businessName: dto.businessName.trim(),
        category: dto.category.trim(),
        country: dto.country.trim(),
        storeUrl: dto.storeUrl?.trim() || null,
      },
    });

    const discoveryResults: OnboardingDiscoveryResult[] = [];

    for (const competitorInput of dto.competitors) {
      const url = competitorInput.url.trim();
      const name =
        competitorInput.name?.trim() || this.competitorNameFromUrl(url);
      const competitor = await this.prisma.competitor.create({
        data: {
          businessProfileId: profile.id,
          name,
          url,
        },
      });

      try {
        const discovery =
          await this.discoveryService.discoverCompetitor(competitor.id);
        discoveryResults.push({
          competitorId: competitor.id,
          name: competitor.name,
          url: competitor.url,
          platform: discovery.platform,
          discovered: discovery.discovered,
          created: discovery.created,
        });
      } catch (error) {
        discoveryResults.push({
          competitorId: competitor.id,
          name: competitor.name,
          url: competitor.url,
          discovered: 0,
          created: 0,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to discover products for this competitor.',
        });
      }
    }

    const successful = discoveryResults.filter((result) => result.created > 0);
    if (successful.length === 0) {
      await this.prisma.competitor.deleteMany({
        where: { businessProfileId: profile.id },
      });
      await this.prisma.businessProfile.delete({
        where: { id: profile.id },
      });
      throw new BadGatewayException({
        message:
          'NO_PRODUCTS_DISCOVERED: no products could be discovered from the competitor URLs provided. Check the URLs and try again.',
        competitors: discoveryResults,
      });
    }

    return {
      profile,
      competitors: discoveryResults,
      totalDiscovered: successful.reduce(
        (sum, result) => sum + result.discovered,
        0,
      ),
      totalCreated: successful.reduce((sum, result) => sum + result.created, 0),
    };
  }

  private competitorNameFromUrl(url: string) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0]?.toLowerCase() === 'shop' && parts[1]) {
        return parts[1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (letter) => letter.toUpperCase());
      }
      return parsed.hostname.replace(/^www\./i, '');
    } catch {
      return url;
    }
  }
}
