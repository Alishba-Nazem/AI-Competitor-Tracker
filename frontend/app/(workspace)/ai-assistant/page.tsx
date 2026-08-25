import type { Metadata } from "next";
import { AssistantClient } from "./assistant-client";

export const metadata: Metadata = {
  title: "AI Competitor Analyst",
  description: "Ask Gemini about captured competitor prices, catalog changes, and reviews.",
};

export default function AssistantPage() {
  return <AssistantClient />;
}
