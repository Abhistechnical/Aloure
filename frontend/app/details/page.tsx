"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAnalysis } from "../providers/analysis-provider";

export default function DetailsPage() {
  const router = useRouter();
  const { result, status, downloadJson, downloadPdf } = useAnalysis();

  useEffect(() => {
    if (status !== "ready" || !result) {
      router.replace("/upload");
    }
  }, [result, status, router]);

  if (!result) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F3EE] px-6 py-14">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-[#1E1B18]/60">Formula intelligence</p>
          <h1 className="font-serif text-4xl text-[#1E1B18]">Mixing proportions</h1>
          <p className="text-sm text-[#1E1B18]/70">
            Each pigment card shows the percentage that emerges from the LAB analysis. The solver respects non-negative, sum-to-100 constraints.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {result.formula.map((pigment) => (
            <article
              key={pigment.pigment}
              className="rounded-3xl border border-[#1E1B18]/10 bg-white/90 p-6 shadow-[0_10px_30px_rgba(30,27,24,0.08)]"
            >
              <div className="flex items-center gap-4">
                <span
                  className="h-12 w-12 rounded-2xl border border-[#1E1B18]/20"
                  style={{ background: pigment.color }}
                />
                <div>
                  <h2 className="text-lg font-semibold text-[#1E1B18]">{pigment.pigment}</h2>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#1E1B18]/60">{pigment.percentage.toFixed(1)}%</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-[#1E1B18]/70">{pigment.description}</p>
            </article>
          ))}
        </div>
        <div className="rounded-3xl border border-[#1E1B18]/10 bg-white/90 p-6 shadow-[0_10px_30px_rgba(30,27,24,0.08)]">
          <p className="text-xs uppercase tracking-[0.4em] text-[#1E1B18]/60">Export</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={downloadJson}
              className="rounded-full border border-transparent bg-[#1E1B18] px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#F7F3EE] transition hover:-translate-y-0.5"
            >
              Export JSON
            </button>
            <button
              onClick={downloadPdf}
              className="rounded-full border border-[#1E1B18]/40 bg-white/80 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1E1B18] transition hover:border-[#1E1B18]"
            >
              Export PDF
            </button>
            <Link
              href="/result"
              className="rounded-full border border-[#1E1B18]/40 bg-white/80 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1E1B18] transition hover:border-[#1E1B18]"
            >
              Back to result
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
