import { discoverShopifyProducts } from './shopify-discovery';

describe('discoverShopifyProducts', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('discovers product URLs from products.json without saving prices', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            products: [
              {
                id: 1,
                title: 'Floating on Air',
                handle: 'floating-on-air',
                images: [{ src: 'https://cdn.example/img.jpg' }],
                variants: [{ available: true }],
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ products: [] }),
      });

    await expect(
      discoverShopifyProducts('https://colourpop.com'),
    ).resolves.toEqual([
      {
        name: 'Floating on Air',
        url: 'https://colourpop.com/products/floating-on-air',
        externalId: '1',
        imageUrl: 'https://cdn.example/img.jpg',
        availability: 'IN_STOCK',
      },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://colourpop.com/products.json?limit=50&page=1',
      expect.any(Object),
    );
  });
});
