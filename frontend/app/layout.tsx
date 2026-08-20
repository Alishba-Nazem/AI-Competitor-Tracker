import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ecommerce Competitor Tracker",
  description: "See what your competitors are changing and where the market is moving.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
