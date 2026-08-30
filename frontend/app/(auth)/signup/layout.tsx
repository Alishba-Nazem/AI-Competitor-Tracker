import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Create account · Ecommerce Competitor Tracker",
  },
  description: "Create an Ecommerce Competitor Tracker workspace to track competitor stores and reviews.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
