import type { PriceBand, ReviewSentiment, ReviewTheme } from "@/lib/types";
import { formatPrice } from "@/lib/format";

/**
 * Charts are plain SVG/CSS on purpose: no charting dependency, so the dashboard
 * bundle and Lighthouse budget stay where the audit left them. Every value is
 * also rendered as text, so screen readers never depend on the drawing.
 */

type Tone = "positive" | "neutral" | "negative" | "accent";

const TONE_FILL: Record<Tone, string> = {
  positive: "#047857",
  neutral: "#b45309",
  negative: "#be123c",
  accent: "#1d4f7c",
};

const TONE_TEXT: Record<Tone, string> = {
  positive: "text-emerald-800",
  neutral: "text-amber-800",
  negative: "text-rose-800",
  accent: "text-[#163e62]",
};

/** Rebuilds sentiment counts for a single product from its stored star distribution. */
export function sentimentFromDistribution(
  distribution: Record<string, number>,
  totalReviews: number,
): ReviewSentiment {
  const at = (star: string) => distribution[star] ?? 0;
  const positive = at("4") + at("5");
  const neutral = at("3");
  const negative = at("1") + at("2");
  const rated = positive + neutral + negative;
  const weighted = ["1", "2", "3", "4", "5"].reduce(
    (sum, star) => sum + Number(star) * at(star),
    0,
  );

  return {
    rated,
    unrated: Math.max(totalReviews - rated, 0),
    positive,
    neutral,
    negative,
    positivePercent: rated ? Number(((positive / rated) * 100).toFixed(1)) : null,
    negativePercent: rated ? Number(((negative / rated) * 100).toFixed(1)) : null,
    averageRating: rated ? Number((weighted / rated).toFixed(2)) : null,
    ratingDistribution: distribution,
  };
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

export function SentimentChart({ sentiment }: { sentiment: ReviewSentiment }) {
  const { rated, positive, neutral, negative } = sentiment;

  if (rated === 0) {
    return (
      <p className="text-sm text-stone-600" role="status">
        No star ratings stored yet, so likes and dislikes cannot be measured. Capture public
        reviews from a competitor workspace first.
      </p>
    );
  }

  const segments: Array<{ label: string; value: number; tone: Tone }> = [
    { label: "Liked (4–5★)", value: positive, tone: "positive" },
    { label: "Mixed (3★)", value: neutral, tone: "neutral" },
    { label: "Disliked (1–2★)", value: negative, tone: "negative" },
  ];

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <Donut
        segments={segments.map((item) => ({
          value: item.value,
          color: TONE_FILL[item.tone],
        }))}
        total={rated}
        centerValue={`${Math.round(percent(positive, rated))}%`}
        centerLabel="liked"
      />
      <div className="min-w-0 flex-1">
        <ul className="space-y-2.5">
          {segments.map((item) => (
            <li key={item.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-900">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: TONE_FILL[item.tone] }}
                    aria-hidden="true"
                  />
                  {item.label}
                </span>
                <span className={`shrink-0 tabular-nums font-semibold ${TONE_TEXT[item.tone]}`}>
                  {item.value} ({Math.round(percent(item.value, rated))}%)
                </span>
              </div>
              <Track value={item.value} max={rated} tone={item.tone} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone-600">
          {rated} rated review{rated === 1 ? "" : "s"}
          {sentiment.averageRating !== null ? ` · ${sentiment.averageRating} average stars` : ""}
          {sentiment.unrated > 0
            ? ` · ${sentiment.unrated} review${sentiment.unrated === 1 ? "" : "s"} stored without a rating`
            : ""}
        </p>
      </div>
    </div>
  );
}

export function RatingHistogram({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const rows = ["5", "4", "3", "2", "1"].map((star) => ({
    star,
    count: distribution[star] ?? 0,
  }));
  const max = Math.max(...rows.map((row) => row.count), 1);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  if (total === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">Rating spread</h3>
      <ul className="mt-2.5 space-y-1.5">
        {rows.map((row) => (
          <li key={row.star} className="flex items-center gap-3 text-sm">
            <span className="w-10 shrink-0 tabular-nums text-stone-700">{row.star}★</span>
            <span className="min-w-0 flex-1">
              <Track
                value={row.count}
                max={max}
                tone={Number(row.star) >= 4 ? "positive" : Number(row.star) <= 2 ? "negative" : "neutral"}
              />
            </span>
            <span className="w-8 shrink-0 text-right tabular-nums text-stone-700">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ThemeBars({
  title,
  items,
  tone,
  empty,
}: {
  title: string;
  items: ReviewTheme[];
  tone: Tone;
  empty: string;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-stone-600">{empty}</p>
      ) : (
        <ul className="mt-2.5 space-y-2">
          {items.map((item) => (
            <li key={item.theme}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate capitalize text-slate-900">{item.theme}</span>
                <span className={`shrink-0 tabular-nums font-semibold ${TONE_TEXT[tone]}`}>
                  {item.count}
                </span>
              </div>
              <Track value={item.count} max={max} tone={tone} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PriceRangeBar({ band }: { band: PriceBand }) {
  const span = band.max - band.min;
  const medianOffset = span > 0 ? ((band.median - band.min) / span) * 100 : 50;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-slate-900">Captured price range</span>
        <span className="tabular-nums text-stone-700">{band.sampleSize} products</span>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-stone-200" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-[#1d4f7c]" />
        <div
          className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-slate-900"
          style={{ left: `${medianOffset}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between gap-2 text-xs text-stone-700">
        <span className="tabular-nums">Low {formatPrice(band.min, band.currency)}</span>
        <span className="tabular-nums font-semibold text-slate-900">
          Median {formatPrice(band.median, band.currency)}
        </span>
        <span className="tabular-nums">High {formatPrice(band.max, band.currency)}</span>
      </div>
    </div>
  );
}

function Track({ value, max, tone }: { value: number; max: number; tone: Tone }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;

  return (
    <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-stone-200" aria-hidden="true">
      <span
        className="block h-full rounded-full"
        style={{ width: `${width}%`, background: TONE_FILL[tone] }}
      />
    </span>
  );
}

function Donut({
  segments,
  total,
  centerValue,
  centerLabel,
}: {
  segments: Array<{ value: number; color: string }>;
  total: number;
  centerValue: string;
  centerLabel: string;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;

  return (
    <div className="relative mx-auto h-[132px] w-[132px] shrink-0 sm:mx-0">
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90" aria-hidden="true" focusable="false">
        <circle cx="66" cy="66" r={radius} fill="none" stroke="#e7e5e4" strokeWidth="14" />
        {segments.map((segment, index) => {
          if (segment.value <= 0) return null;
          const length = (segment.value / total) * circumference;
          const offset = -consumed;
          consumed += length;
          return (
            <circle
              key={index}
              cx="66"
              cy="66"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="14"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center" aria-hidden="true">
        <span>
          <span className="block text-2xl font-semibold tabular-nums text-slate-900">{centerValue}</span>
          <span className="block text-xs text-stone-600">{centerLabel}</span>
        </span>
      </span>
    </div>
  );
}
