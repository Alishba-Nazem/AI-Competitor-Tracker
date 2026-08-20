import { extractJsonLdProduct } from './jsonld-extractor';

describe('extractJsonLdProduct', () => {
  it('reads Product Offer price currency and availability from JSON-LD', () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Canvas Tote",
          "image": "https://cdn.example/tote.jpg",
          "offers": {
            "@type": "Offer",
            "price": "49.99",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        }
      </script>
    `;

    expect(extractJsonLdProduct(html)).toEqual({
      name: 'Canvas Tote',
      price: 49.99,
      currency: 'USD',
      availability: 'IN_STOCK',
      imageUrl: 'https://cdn.example/tote.jpg',
      scrapeMethod: 'jsonld',
    });
  });

  it('prefers the higher purchase Offer when multiple Offer prices exist', () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type":"Product",
          "name":"iPhone 15",
          "offers":[
            {"@type":"Offer","price":"10","priceCurrency":"USD"},
            {"@type":"Offer","price":"799","priceCurrency":"USD"}
          ]
        }
      </script>
    `;
    expect(extractJsonLdProduct(html)).toMatchObject({
      name: 'iPhone 15',
      price: 799,
      currency: 'USD',
      scrapeMethod: 'jsonld',
    });
  });

  it('returns undefined when JSON-LD has no trustworthy price', () => {
    const html = `
      <script type="application/ld+json">
        { "@type": "Product", "name": "No price" }
      </script>
    `;
    expect(extractJsonLdProduct(html)).toBeUndefined();
  });
});
