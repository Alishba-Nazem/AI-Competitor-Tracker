import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ownedCompetitorWhere } from '../auth/workspace.service';
import { PrismaService } from '../prisma.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';

@Injectable()
export class CompetitorsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(userId: number, createCompetitorDto: CreateCompetitorDto) {
    const profile = await this.prismaService.businessProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new BadRequestException(
        'Complete onboarding before adding competitors.',
      );
    }

    return this.prismaService.competitor.create({
      data: {
        businessProfileId: profile.id,
        name: createCompetitorDto.name,
        url: createCompetitorDto.url,
        isActive: createCompetitorDto.isActive ?? true,
      },
    });
  }

  async findAll(userId: number) {
    const competitors = await this.prismaService.competitor.findMany({
      where: ownedCompetitorWhere(userId),
      orderBy: { id: 'asc' },
      include: {
        captureLogs: {
          orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });

    return competitors.map((competitor) => {
      const latestCapture = competitor.captureLogs[0] ?? null;
      const { captureLogs: _logs, ...rest } = competitor;
      return {
        ...rest,
        latestCapture,
        nextCaptureAt: computeNextCaptureAt(
          competitor.captureFrequency,
          competitor.lastCapturedAt,
        ),
      };
    });
  }

  async findOne(userId: number, id: number) {
    const competitor = await this.prismaService.competitor.findFirst({
      where: { id, ...ownedCompetitorWhere(userId) },
      include: {
        captureLogs: {
          orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });

    if (!competitor) {
      throw new NotFoundException(`Competitor with ID ${id} not found`);
    }

    const latestCapture = competitor.captureLogs[0] ?? null;
    const { captureLogs: _logs, ...rest } = competitor;
    return {
      ...rest,
      latestCapture,
      nextCaptureAt: computeNextCaptureAt(
        competitor.captureFrequency,
        competitor.lastCapturedAt,
      ),
    };
  }

  async update(userId: number, id: number, updateCompetitorDto: UpdateCompetitorDto) {
    await this.findOne(userId, id);

    return this.prismaService.competitor.update({
      where: { id },
      data: updateCompetitorDto,
    });
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);

    await this.prismaService.competitor.delete({
      where: { id },
    });

    return { message: `Competitor with ID ${id} deleted successfully` };
  }
}

function computeNextCaptureAt(
  frequency: string,
  lastCapturedAt: Date | null,
): string | null {
  if (!lastCapturedAt) return new Date().toISOString();
  const base = lastCapturedAt.getTime();
  if (frequency === 'WEEKLY') {
    return new Date(base + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  // DAILY cron runs at next midnight UTC after last capture day
  const next = new Date(lastCapturedAt);
  next.setUTCHours(24, 0, 0, 0);
  return next.toISOString();
}
