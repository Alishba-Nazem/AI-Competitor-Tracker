import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-competitor-tracker.vercel.app"),
  title: {
    default: "Ecommerce Competitor Tracker",
    template: "%s · Ecommerce Competitor Tracker",
  },
  description: "See what your competitors are changing and where the market is moving.",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${ibmPlexSans.className}`}>
      <body className="min-h-full font-sans">
        {children}
      </body>
    </html>
  );
}
