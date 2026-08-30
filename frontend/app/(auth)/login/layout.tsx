import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Sign in · Ecommerce Competitor Tracker",
  },
  description: "Sign in to Ecommerce Competitor Tracker to monitor competitor prices, catalogs, and reviews.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
