import {
  resolveCatalogAvailability,
  resolveDarazAvailability,
  resolveShopifyAvailability,
} from './availability';

describe('resolveShopifyAvailability', () => {
  it('returns IN_STOCK when a relevant variant is available', () => {
    expect(resolveShopifyAvailability([{ id: 1, available: true }])).toBe(
      'IN_STOCK',
    );
  });

  it('returns OUT_OF_STOCK when every relevant variant is unavailable', () => {
    expect(
      resolveShopifyAvailability([
        { id: 1, available: false },
        { id: 2, available: false },
      ]),
    ).toBe('OUT_OF_STOCK');
  });

  it('returns IN_STOCK when mixed variants include at least one available', () => {
    expect(
      resolveShopifyAvailability([
        { id: 1, available: false },
        { id: 2, available: true },
      ]),
    ).toBe('IN_STOCK');
  });

  it('returns UNKNOWN when availability flags are missing or the variant is absent', () => {
    expect(resolveShopifyAvailability([{ id: 1 }])).toBe('UNKNOWN');
    expect(resolveShopifyAvailability([])).toBe('UNKNOWN');
    expect(
      resolveShopifyAvailability([{ id: 1, available: false }], '999'),
    ).toBe('UNKNOWN');
  });

  it('does not treat a missing requested variant as out of stock', () => {
    expect(
      resolveShopifyAvailability([{ id: 101, available: true }], '202'),
    ).toBe('UNKNOWN');
  });
});

describe('resolveDarazAvailability', () => {
  it('returns IN_STOCK when operation.disable is explicitly false', () => {
    expect(resolveDarazAvailability({ operation: { disable: false } })).toBe(
      'IN_STOCK',
    );
  });

  it('returns OUT_OF_STOCK when operation.disable is explicitly true', () => {
    expect(resolveDarazAvailability({ operation: { disable: true } })).toBe(
      'OUT_OF_STOCK',
    );
  });

  it('returns UNKNOWN when the sku or disable flag is missing', () => {
    expect(resolveDarazAvailability(undefined)).toBe('UNKNOWN');
    expect(resolveDarazAvailability({})).toBe('UNKNOWN');
    expect(resolveDarazAvailability({ operation: {} })).toBe('UNKNOWN');
  });
});

describe('resolveCatalogAvailability', () => {
  it('maps explicit catalog booleans and leaves the rest unknown', () => {
    expect(resolveCatalogAvailability(true)).toBe('IN_STOCK');
    expect(resolveCatalogAvailability(false)).toBe('OUT_OF_STOCK');
    expect(resolveCatalogAvailability(undefined)).toBe('UNKNOWN');
  });
});
