"use client";

import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import CompetitorWorkspacePage from "./workspace";

export default function CompetitorPage() {
  return (
    <Suspense fallback={<LoadingState text="Loading competitor workspace…" />}>
      <CompetitorWorkspacePage />
    </Suspense>
  );
}
