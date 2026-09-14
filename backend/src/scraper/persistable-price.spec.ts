import {
  isPersistableCapturedPrice,
  MAX_PERSISTABLE_PRICE,
} from './persistable-price';

describe('isPersistableCapturedPrice', () => {
  it('accepts typical selling prices inside Decimal(12,2)', () => {
    expect(isPersistableCapturedPrice(84.95)).toBe(true);
    expect(isPersistableCapturedPrice(101_999)).toBe(true);
    expect(isPersistableCapturedPrice(MAX_PERSISTABLE_PRICE)).toBe(true);
  });

  it('rejects zero, negative, and non-finite values', () => {
    expect(isPersistableCapturedPrice(0)).toBe(false);
    expect(isPersistableCapturedPrice(-12)).toBe(false);
    expect(isPersistableCapturedPrice(Number.NaN)).toBe(false);
    expect(isPersistableCapturedPrice(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('rejects 13-digit identifiers that overflow NUMERIC(12,2)', () => {
    expect(isPersistableCapturedPrice(8_901_234_567_890)).toBe(false);
    expect(isPersistableCapturedPrice(MAX_PERSISTABLE_PRICE + 0.01)).toBe(false);
  });
});
