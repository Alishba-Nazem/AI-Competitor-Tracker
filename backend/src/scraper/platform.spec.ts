import { detectPlatform } from './platform';

describe('detectPlatform', () => {
  it('detects Daraz from hostname', () => {
    expect(
      detectPlatform(
        'https://www.daraz.pk/shop/bonanza-satrangi',
        '<html></html>',
      ),
    ).toBe('DARAZ');
  });

  it('detects Daraz from page signals', () => {
    expect(
      detectPlatform(
        'https://example.com/shop',
        '{"isDaraz": true, "siteName": "Daraz"}',
      ),
    ).toBe('DARAZ');
  });

  it('detects Shopify from myshopify hostname', () => {
    expect(
      detectPlatform('https://colourpop.myshopify.com', '<html></html>'),
    ).toBe('SHOPIFY');
  });

  it('detects Shopify from HTML signals', () => {
    expect(
      detectPlatform(
        'https://colourpop.com',
        '<script>window.Shopify = {shop:"colourpop.com"}</script>',
      ),
    ).toBe('SHOPIFY');
  });

  it('returns UNKNOWN when no platform signals exist', () => {
    expect(
      detectPlatform(
        'https://www.example.com',
        '<html><title>Store</title></html>',
      ),
    ).toBe('UNKNOWN');
  });
});
