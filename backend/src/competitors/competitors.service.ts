import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';

@Injectable()
export class CompetitorsService {
  constructor(private readonly prismaService: PrismaService) {}

  create(createCompetitorDto: CreateCompetitorDto) {
    return this.prismaService.competitor.create({
      data: {
        name: createCompetitorDto.name,
        url: createCompetitorDto.url,
        isActive: createCompetitorDto.isActive ?? true,
      },
    });
  }

  async findAll() {
    const competitors = await this.prismaService.competitor.findMany({
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

  async findOne(id: number) {
    const competitor = await this.prismaService.competitor.findUnique({
      where: { id },
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

  async update(id: number, updateCompetitorDto: UpdateCompetitorDto) {
    await this.findOne(id);

    return this.prismaService.competitor.update({
      where: { id },
      data: updateCompetitorDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

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
