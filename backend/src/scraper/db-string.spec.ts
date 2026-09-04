import {
  clipDbString,
  PRODUCT_EXTERNAL_ID_MAX_CHARS,
  PRODUCT_NAME_MAX_CHARS,
} from './db-string';

describe('clipDbString', () => {
  it('returns the original string when it already fits', () => {
    expect(clipDbString('Canvas Tote', PRODUCT_NAME_MAX_CHARS)).toBe(
      'Canvas Tote',
    );
  });

  it('clips to the VARCHAR character budget without splitting code points', () => {
    const oversized = `${'n'.repeat(PRODUCT_NAME_MAX_CHARS - 1)}🎉extra`;
    const clipped = clipDbString(oversized, PRODUCT_NAME_MAX_CHARS);
    expect([...clipped]).toHaveLength(PRODUCT_NAME_MAX_CHARS);
    expect(clipped.endsWith('🎉')).toBe(true);
    expect(clipped.includes('extra')).toBe(false);
  });

  it('clips external ids to 64 characters', () => {
    const oversized = 'x'.repeat(PRODUCT_EXTERNAL_ID_MAX_CHARS + 8);
    expect(clipDbString(oversized, PRODUCT_EXTERNAL_ID_MAX_CHARS)).toHaveLength(
      PRODUCT_EXTERNAL_ID_MAX_CHARS,
    );
  });
});
