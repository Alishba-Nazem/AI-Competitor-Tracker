import {
  discoverDarazProducts,
  parseDarazPageData,
  parseDarazSellerKeyFromUrl,
  parseDarazShopName,
} from './daraz-discovery';

describe('discoverDarazProducts', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses seller identity from window.pageData', () => {
    const html =
      '<script>window.pageData = {"sellerId":7868,"sellerKey":"bonanza-satrangi","title":"Bonanza"}</script>';
    expect(parseDarazPageData(html)).toEqual({
      sellerId: 7868,
      sellerKey: 'bonanza-satrangi',
      title: 'Bonanza',
    });
  });

  it('parses shop name from Daraz title tag', () => {
    const html =
      '<title>Shop online with (FA) Ayan mall now! Visit (FA) Ayan mall on Daraz.</title>';
    expect(parseDarazShopName(html)).toBe('(FA) Ayan mall');
  });

  it('reads sellerKey from wangpu and /shop/ storefront URLs', () => {
    expect(
      parseDarazSellerKeyFromUrl('https://www.daraz.pk/apple-flagshipstore/'),
    ).toBe('apple-flagshipstore');
    expect(
      parseDarazSellerKeyFromUrl('https://www.daraz.pk/shop/6pvpbrik/'),
    ).toBe('6pvpbrik');
  });

  it('keeps catalog items that match the shop sellerId and skips other sellers', async () => {
    const html =
      'window.pageData = {"sellerId":7868,"sellerKey":"bonanza satrangi"}';
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const href = String(url);
      if (href.includes('from=wangpu')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              mods: { listItems: [] },
              mainInfo: { noMorePages: true },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            mods: {
              listItems: [
                {
                  name: 'Other seller shirt',
                  sellerId: 99,
                  itemUrl: '//www.daraz.pk/products/other-i1.html',
                },
                {
                  name: 'Bonanza Kurta',
                  sellerId: 7868,
                  nid: 1965260634,
                  itemUrl: '//www.daraz.pk/products/kurta-i1965260634.html',
                  image: 'https://img.example/k.jpg',
                  inStock: true,
                },
                {
                  name: 'Sponsored item',
                  sellerId: 7868,
                  isSponsored: true,
                  itemUrl: '//www.daraz.pk/products/ad-i2.html',
                },
              ],
            },
            mainInfo: { noMorePages: true },
          }),
      });
    });

    await expect(
      discoverDarazProducts('https://www.daraz.pk/shop/bonanza-satrangi', html),
    ).resolves.toEqual([
      {
        name: 'Bonanza Kurta',
        url: 'https://www.daraz.pk/products/kurta-i1965260634.html',
        externalId: '1965260634',
        imageUrl: 'https://img.example/k.jpg',
        availability: 'IN_STOCK',
      },
    ]);
  });

  it('uses shopId wangpu catalog before global search', async () => {
    const html =
      '<title>Shop online with Apple Flagship Store now! Visit Apple Flagship Store on Daraz.</title>' +
      'window.pageData = {"sellerId":6005657392001,"sellerKey":"apple-flagshipstore","bizId":2559934,"shopId":2559934}';
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const href = String(url);
      if (href.includes('shopId=2559934') && href.includes('from=wangpu')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                mods: {
                  listItems: [
                    {
                      name: 'Apple iPhone 17 Pro Max',
                      sellerId: '6005657392001',
                      nid: 1958136639,
                      itemUrl: '//www.daraz.pk/products/iphone-i1958136639.html',
                      inStock: true,
                    },
                    {
                      name: 'Apple 20W USB-C Power Adapter',
                      sellerId: '6005657392001',
                      nid: 1961023470,
                      itemUrl:
                        '//www.daraz.pk/products/adapter-i1961023470.html',
                      inStock: true,
                    },
                  ],
                },
                mainInfo: { noMorePages: true, totalResults: 28 },
              }),
            ),
          headers: { get: () => 'application/json' },
        });
      }
      return Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              mods: {
                listItems: [
                  {
                    name: 'Global search leftover',
                    sellerId: '6005657392001',
                    nid: 1,
                    itemUrl: '//www.daraz.pk/products/leftover-i1.html',
                  },
                ],
              },
              mainInfo: { noMorePages: true },
            }),
          ),
        headers: { get: () => 'application/json' },
      });
    });

    await expect(
      discoverDarazProducts('https://www.daraz.pk/apple-flagshipstore/', html),
    ).resolves.toEqual([
      {
        name: 'Apple iPhone 17 Pro Max',
        url: 'https://www.daraz.pk/products/iphone-i1958136639.html',
        externalId: '1958136639',
        imageUrl: undefined,
        availability: 'IN_STOCK',
      },
      {
        name: 'Apple 20W USB-C Power Adapter',
        url: 'https://www.daraz.pk/products/adapter-i1961023470.html',
        externalId: '1961023470',
        imageUrl: undefined,
        availability: 'IN_STOCK',
      },
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('shopId=2559934'),
      expect.any(Object),
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/catalog\/\?ajax=true&q=/),
      expect.any(Object),
    );
  });

  it('keeps wangpu shop items even when sellerId is missing', async () => {
    const html =
      '<title>Shop online with Apple Flagship Store now! Visit Apple Flagship Store on Daraz.</title>';
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const href = String(url);
      if (href.includes('from=wangpu')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              mods: {
                listItems: [
                  {
                    name: 'AirTag (1 Pack)',
                    nid: 1958134648,
                    itemUrl: '//www.daraz.pk/products/airtag-i1958134648.html',
                    inStock: true,
                  },
                ],
              },
              mainInfo: { noMorePages: true },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            mods: { listItems: [] },
            mainInfo: { noMorePages: true },
          }),
      });
    });

    await expect(
      discoverDarazProducts('https://www.daraz.pk/apple-flagshipstore/', html),
    ).resolves.toEqual([
      {
        name: 'AirTag (1 Pack)',
        url: 'https://www.daraz.pk/products/airtag-i1958134648.html',
        externalId: '1958134648',
        imageUrl: undefined,
        availability: 'IN_STOCK',
      },
    ]);
  });

  it('falls back to wangpu in-shop catalog when global search finds nothing', async () => {
    const html =
      '<title>Shop online with (FA) Ayan mall now! Visit (FA) Ayan mall on Daraz.</title>' +
      'window.pageData = {"sellerId":6005426368381,"sellerKey":"6pvpbrik","bizId":2186731}';
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const href = String(url);
      if (href.includes('q=All-Products&from=wangpu')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              mods: {
                listItems: [
                  {
                    name: 'Ayan Handbag',
                    sellerId: '6005426368381',
                    nid: 750688123,
                    itemUrl: '//www.daraz.pk/products/-i750688123.html',
                    inStock: true,
                  },
                ],
              },
              mainInfo: { noMorePages: true },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            mods: { listItems: [] },
            mainInfo: { noMorePages: true },
          }),
      });
    });

    await expect(
      discoverDarazProducts('https://www.daraz.pk/shop/6pvpbrik/', html),
    ).resolves.toEqual([
      {
        name: 'Ayan Handbag',
        url: 'https://www.daraz.pk/products/-i750688123.html',
        externalId: '750688123',
        imageUrl: undefined,
        availability: 'IN_STOCK',
      },
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/6pvpbrik/?q=All-Products&from=wangpu'),
      expect.any(Object),
    );
  });
});
