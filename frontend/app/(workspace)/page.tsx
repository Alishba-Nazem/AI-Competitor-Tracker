import type { Metadata } from "next";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Research",
  description: "Research competitor prices, catalog changes, and customer reviews from stored captures.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
