"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAnalysis } from "../providers/analysis-provider";

export default function AnalysisPage() {
  const router = useRouter();
  const { imageFile, status, startAnalysis } = useAnalysis();

  useEffect(() => {
    if (!imageFile) {
      router.replace("/upload");
      return;
    }
    if (status === "idle") {
      void startAnalysis();
    }
  }, [imageFile, status, startAnalysis, router]);

  useEffect(() => {
    if (status === "ready") {
      const timeout = setTimeout(() => router.replace("/result"), 650);
      return () => clearTimeout(timeout);
    }
  }, [status, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F7F3EE] px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.5em] text-[#1E1B18]/50">Analysis</p>
      <h1 className="font-serif text-4xl text-[#1E1B18]">Calibrating skin tone…</h1>
      <p className="max-w-xl text-sm text-[#1E1B18]/70">
        We sample forehead, contour, and cheek pixels, normalize for light, and gently converge on the couture match.
      </p>
      <div className="flex items-center gap-3">
        {[0, 1, 2].map((pulse) => (
          <span
            key={pulse}
            className="h-3 w-3 rounded-full bg-[#1E1B18] opacity-70 animate-pulse"
            style={{ animationDelay: `${pulse * 200}ms` }}
          />
        ))}
      </div>
      <div className="mt-5 h-3 w-60 overflow-hidden rounded-full bg-[#1E1B18]/20">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#f7d166] via-[#e4696d] to-[#1E1B18]" />
      </div>
      <p className="text-[0.65rem] uppercase tracking-[0.4em] text-[#1E1B18]/60">Please keep the window open. Precision takes a heartbeat.</p>
    </main>
  );
}
