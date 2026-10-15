import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  const prisma = {
    competitor: { findFirst: jest.fn() },
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('updates only name, url, price, and currency', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 10,
      competitorId: 3,
      name: 'Tote',
    });
    prisma.product.update.mockResolvedValue({ id: 10, name: 'Leather tote' });

    await service.update(7, 10, {
      name: 'Leather tote',
      url: 'https://shop.example/products/tote',
      currentPrice: 42.5,
      currency: 'USD',
    });

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        name: 'Leather tote',
        url: 'https://shop.example/products/tote',
        currentPrice: 42.5,
        currency: 'USD',
      },
    });
  });

  it('does not reassign competitorId or apply nested relation writes', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 10,
      competitorId: 3,
      name: 'Tote',
    });
    prisma.product.update.mockResolvedValue({ id: 10, name: 'Tote' });

    await service.update(7, 10, {
      name: 'Tote',
      competitorId: 999,
      competitor: { connect: { id: 999 }, create: { name: 'Stolen' } },
      reviews: { deleteMany: {} },
      snapshotProducts: { deleteMany: {} },
    } as {
      name?: string;
      url?: string;
      currentPrice?: number;
      currency?: string;
      competitorId?: number;
      competitor?: unknown;
      reviews?: unknown;
      snapshotProducts?: unknown;
    });

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { name: 'Tote' },
    });
  });

  it('rejects updates for products outside the caller workspace', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.update(7, 10, { name: 'Nope' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});
