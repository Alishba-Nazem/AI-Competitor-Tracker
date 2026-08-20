import { createHash } from 'crypto';

export function reviewFingerprint(input: {
  productId: number;
  text: string;
  rating?: number;
  reviewDate?: Date;
}) {
  const normalized = input.text.replace(/\s+/g, ' ').trim().toLowerCase();
  const date = input.reviewDate
    ? input.reviewDate.toISOString().slice(0, 10)
    : '';
  return createHash('sha256')
    .update(`${input.productId}|${input.rating ?? ''}|${normalized}|${date}`)
    .digest('hex')
    .slice(0, 32);
}
