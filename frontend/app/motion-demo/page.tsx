import type { Metadata } from "next";
import { MotionDemoClient } from "./motion-demo-client";

export const metadata: Metadata = {
  title: "Motion Button Lifecycle",
  description: "Idle, hover, loading, success, and error motion states for Send to AI Analyst.",
};

export default function MotionDemoPage() {
  return (
    <main className="min-h-dvh bg-[#f5f5f4]">
      <a href="#motion-demo" className="skip-link">
        Skip to demo
      </a>
      <div id="motion-demo">
        <MotionDemoClient />
      </div>
    </main>
  );
}
