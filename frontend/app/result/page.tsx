"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAnalysis } from "../providers/analysis-provider";

export default function ResultPage() {
  const router = useRouter();
  const { result, status, downloadJson, reset } = useAnalysis();

  useEffect(() => {
    if (status !== "ready" || !result) {
      router.replace("/upload");
    }
  }, [result, status, router]);

  if (!result) {
    return null;
  }

  const handleAnother = () => {
    reset();
    router.push("/upload");
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#F7F3EE] px-6 py-14">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="rounded-[32px] border border-[#1E1B18]/20 bg-white/90 p-8 shadow-[0_30px_60px_rgba(30,27,24,0.12)]">
          <p className="text-xs uppercase tracking-[0.4em] text-[#1E1B18]/60">Result</p>
          <h1 className="mt-3 font-serif text-5xl text-[#1E1B18]">{result.shadeName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#1E1B18]/70">
            A bespoke tone pulled from your portrait. Every detail is recalculated, no caches, no shortcuts—just couture precision.
          </p>
          <div className="mt-8 rounded-[36px] border border-[#1E1B18]/10 bg-gradient-to-br from-[#F7F3EE] via-[#fbeeea] to-[#f0c7a1] p-10">
            <div
              className="h-56 rounded-[30px]"
              style={{ background: `linear-gradient(135deg, ${result.hex} 0%, #ffffff 70%)` }}
            />
            <div className="mt-6 flex items-center justify-between text-sm uppercase tracking-[0.4em] text-[#1E1B18]/70">
              <span>Confidence {result.confidence.toFixed(0)}%</span>
              <span>ΔE {result.deltaE.toFixed(2)}</span>
            </div>
          </div>
          <details className="mt-6 rounded-[28px] border border-[#1E1B18]/10 bg-white/80 p-5 text-sm text-[#1E1B18]/70" open>
            <summary className="font-semibold text-[#1E1B18]">LAB / HEX details</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#1E1B18]/10 bg-[#fdf9f5] p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[#1E1B18]/60">LAB</p>
                <p className="mt-1 text-base font-semibold text-[#1E1B18]">
                  {result.lab.l.toFixed(1)} / {result.lab.a.toFixed(1)} / {result.lab.b.toFixed(1)}
                </p>
              </div>
              <div className="rounded-2xl border border-[#1E1B18]/10 bg-[#fdf9f5] p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[#1E1B18]/60">HEX</p>
                <p className="mt-1 text-base font-semibold text-[#1E1B18]">{result.hex}</p>
              </div>
            </div>
          </details>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={downloadJson}
              className="rounded-full border border-transparent bg-[#1E1B18] px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#F7F3EE] transition hover:-translate-y-0.5"
            >
              Save
            </button>
            <button
              onClick={handleAnother}
              className="rounded-full border border-[#1E1B18]/40 bg-white/80 px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#1E1B18] transition hover:border-[#1E1B18]"
            >
              Try another photo
            </button>
            <Link
              href="/details"
              className="ml-auto rounded-full border border-[#1E1B18]/40 bg-white/80 px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#1E1B18] transition hover:border-[#1E1B18]"
            >
              View formula details
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
