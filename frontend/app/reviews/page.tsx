"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, LoadingState, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import type { Competitor, CompetitorReviews } from "@/lib/types";

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ competitor: Competitor; reviews: CompetitorReviews }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const competitors = await api.getCompetitors();
      const packed = await Promise.all(
        competitors.map(async (competitor) => ({
          competitor,
          reviews: await api.getCompetitorReviews(competitor.id),
        })),
      );
      setRows(packed);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="Public customer reviews collected from product pages. Ratings and comments are never invented."
      />
      <Panel>
        {loading ? (
          <LoadingState text="Loading reviews…" />
        ) : rows.every((row) => row.reviews.products.every((product) => product.totalReviews === 0 && product.available !== false)) ? (
          <EmptyState
            title="No stored reviews yet"
            text="Open a competitor workspace and use Capture reviews. If a store does not publish reviews, the workspace will say they are unavailable."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Competitor</th>
                  <th>Product</th>
                  <th>Rating</th>
                  <th>Reviews</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.flatMap(({ competitor, reviews }) =>
                  reviews.products.map((product) => (
                    <tr key={`${competitor.id}-${product.productId}`}>
                      <td>{competitor.name}</td>
                      <td>{product.name}</td>
                      <td>{product.averageRating != null ? product.averageRating.toFixed(1) : "—"}</td>
                      <td>{product.totalReviews}</td>
                      <td>
                        {product.available === false
                          ? "Unavailable"
                          : product.totalReviews === 0
                            ? "No reviews"
                            : "Stored"}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
