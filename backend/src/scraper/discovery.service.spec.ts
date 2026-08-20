import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { DiscoveryService } from './discovery.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  const prisma = {
    competitor: { findUnique: jest.fn(), update: jest.fn() },
    product: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(DiscoveryService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws when the competitor does not exist', async () => {
    prisma.competitor.findUnique.mockResolvedValue(null);
    await expect(service.discoverCompetitor(9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('detects Shopify, discovers catalog products, and seeds them without a guessed price', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 4,
      url: 'https://colourpop.com',
      products: [],
    });
    prisma.competitor.update.mockResolvedValue({});
    prisma.product.create.mockResolvedValue({});
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            '<script>window.Shopify = {shop:"colourpop.com"}</script>',
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            products: [
              {
                id: 11,
                title: 'Floating on Air',
                handle: 'floating-on-air',
                variants: [],
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ products: [] }),
      });

    await expect(service.discoverCompetitor(4)).resolves.toMatchObject({
      competitorId: 4,
      platform: 'SHOPIFY',
      discovered: 1,
      created: 1,
    });
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        competitorId: 4,
        name: 'Floating on Air',
        url: 'https://colourpop.com/products/floating-on-air',
        currentPrice: 0,
        currency: 'USD',
        externalId: '11',
        imageUrl: undefined,
        availability: 'UNKNOWN',
      },
    });
  });

  it('rejects unsupported store URLs without creating products', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 5,
      url: 'https://www.example.com',
      products: [],
    });
    prisma.competitor.update.mockResolvedValue({});
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><title>Example</title></html>'),
      json: () => Promise.resolve({}),
    });

    await expect(service.discoverCompetitor(5)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.product.create).not.toHaveBeenCalled();
  });
});
