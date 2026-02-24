"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAnalysis } from "../providers/analysis-provider";

const pigmentDefinitions = [
  {
    pigment: "Yellow",
    description:
      "Pure primary pigment — RGB 255,255,0; RYB 0,255,0; CMYK 0,0,255,0 — no cyan or magenta contamination keeps the hue dedicated to yellow when mixing detergents.",
  },
  {
    pigment: "Red",
    description:
      "Pure red channel — RGB 255,0,0; RYB 255,0,0; CMYK 0,255,255,0 — only magenta and yellow inks, so the subtractive mix stays clean without stray blue.",
  },
  {
    pigment: "Blue",
    description:
      "True blue primary — RGB 0,0,255; RYB 0,0,255; CMYK 255,255,0,0 — pure cyan+magenta in CMYK to recreate the same blue found on screen.",
  },
  {
    pigment: "Black",
    description:
      "Neutral black — RGB 0,0,0; RYB 0,0,0; CMYK 0,0,0,255 — only K ink so it behaves as a true pigment anchor without hue bias.",
  },
  {
    pigment: "White",
    description:
      "Neutral white — RGB/RYB 255,255,255; CMYK 0,0,0,0 — no ink at all, so it stays a clean reflective surface across additive and subtractive systems.",
  },
];

export default function ResultPage() {
  const router = useRouter();
  const { result, status, downloadJson, downloadPdf, reset } = useAnalysis();

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
      <section className="mt-8 mx-auto w-full max-w-5xl space-y-6">
        <div className="rounded-3xl border border-[#1E1B18]/10 bg-white/90 p-6 shadow-glass">
          <p className="text-xs uppercase tracking-[0.35em] text-[#1E1B18]/60">Formula breakdown</p>
          <div className="mt-5 space-y-4">
            {result.formula.map((pigment) => (
              <div key={pigment.pigment} className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-2xl border border-[#1E1B18]/20"
                  style={{ background: pigment.color }}
                />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-matteCharcoal">{pigment.pigment}</p>
                  <p className="text-[0.75rem] text-[#1E1B18]/60">{pigment.description}</p>
                </div>
                <p className="text-lg font-serif text-matteCharcoal">{pigment.percentage.toFixed(1)}%</p>
              </div>
            ))}
            {!result && (
              <p className="text-sm text-[#1E1B18]/60">A formula appears after the matching analysis finishes.</p>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={downloadJson}
              disabled={!result}
              className="rounded-full border border-[#1E1B18]/20 px-5 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[#1E1B18]/70 transition hover:border-[#1E1B18] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export JSON
            </button>
            <button
              onClick={downloadPdf}
              disabled={!result}
              className="rounded-full border border-[#1E1B18]/20 px-5 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[#1E1B18]/70 transition hover:border-[#1E1B18] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export PDF
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-[#1E1B18]/10 bg-[#fff8f2]/80 p-6 text-sm text-[#1E1B18]/70 shadow-glass">
          <p className="text-xs uppercase tracking-[0.35em] text-[#1E1B18]/60">Confidence & disclaimers</p>
          <p className="mt-2 text-[0.85rem] text-[#1E1B18]/70">
            Every analysis recomputes from the uploaded pixels. Different images yield different LAB/HEX values, and no
            values are reused from memory. Manual tone codes feed the same solver, so everything on this page is live.
          </p>
        </div>
        <div className="rounded-3xl border border-[#1E1B18]/10 bg-white/90 p-6 shadow-glow">
          <p className="text-xs uppercase tracking-[0.35em] text-[#1E1B18]/60">Color science summary</p>
          <div className="mt-5 space-y-4 text-[0.85rem] text-[#1E1B18]/70">
            <p>
              You are a color-science engine for a pigment-based system: each file is analyzed into pure RGB, RYB, and
              CMYK coordinates so the subtractive mix mirrors the display tone without cross-channel contamination.
            </p>
            <div className="space-y-3">
              {pigmentDefinitions.map((definition) => (
                <div key={definition.pigment} className="rounded-2xl border border-[#1E1B18]/10 bg-[#fdf9f5] p-4 text-sm text-[#1E1B18]/70">
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[#1E1B18]/60">{definition.pigment}</p>
                  <p className="mt-2 text-sm text-[#1E1B18]">{definition.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
