"use client";

import { jsPDF } from "jspdf";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

const defaultReadings = [
  { label: "Jawline", lab: { l: 60.1, a: 13.2, b: 24.5 } },
  { label: "Cheek", lab: { l: 58.6, a: 11.7, b: 26.1 } },
  { label: "Forehead", lab: { l: 61.0, a: 12.9, b: 23.4 } },
];

const timelineSteps = [
  {
    title: "Input Skin Data",
    description: "Capture jawline, cheek, and forehead readings, or upload a face image for an instant average.",
  },
  {
    title: "Skin Tone Analysis",
    description: "Normalize across lighting, present the averaged CIELAB target, and preview the swatch.",
  },
  {
    title: "Pigment Formula",
    description: "Solver returns the couture pigment percentages alongside ΔE confidence.",
  },
  {
    title: "Final Result",
    description: "Lock in the LAB/HEX codes, export JSON or PDF formula sheets, and compare before vs after.",
  },
];

const inputOptions = [
  {
    type: "image",
    title: "Upload Face Image",
    helper: "Jawline + cheek + forehead samples in one upload",
  },
  {
    type: "manual",
    title: "Manual Entry",
    helper: "LAB, RGB, or HEX — we convert everything to CIELAB",
  },
  {
    type: "spectro",
    title: "Spectrophotometer",
    helper: "Paste device snapshots or sync via API",
  },
];

type PigmentIngredient = {
  pigment: string;
  percentage: number;
  description?: string;
};

const fallbackFormula: PigmentIngredient[] = [
  { pigment: "Yellow", percentage: 44.8, description: "Brightens and warms the complexion." },
  { pigment: "Red", percentage: 26.2, description: "Delivers healthy undertones." },
  { pigment: "White", percentage: 19.4, description: "Lightens and softens the mix." },
  { pigment: "Black", percentage: 7.6, description: "Adds depth for natural shadow." },
  { pigment: "Blue", percentage: 2.0, description: "Balances chroma for neutral seams." },
];

type NormalizationResult = {
  targetLab: { l: number; a: number; b: number };
  hex: string;
  swatch: string;
  deltaE: number;
  notes: string;
};

type PigmentFormulaResult = {
  formula: PigmentIngredient[];
  resultLab: { l: number; a: number; b: number };
  deltaE: number;
};

export default function Home() {
  const [inputType, setInputType] = useState<"hex" | "rgb" | "lab" | "image">("hex");
  const [inputValue, setInputValue] = useState("#f7d6c8");
  const [lighting, setLighting] = useState("daylight");
  const [whiteReference, setWhiteReference] = useState({ l: 97.9, a: 0.3, b: 1.1 });
  const [selectedReadings, setSelectedReadings] = useState(defaultReadings.map((reading) => reading.label));
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [normalized, setNormalized] = useState<NormalizationResult | null>(null);
  const [pigmentResult, setPigmentResult] = useState<PigmentFormulaResult | null>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeReadings = defaultReadings.filter((reading) => selectedReadings.includes(reading.label));

  const payloadReadings = activeReadings.map((reading) => ({
    source: reading.label.toLowerCase(),
    lab: reading.lab,
  }));

  const buildPayload = () => {
    const value = inputType === "image" ? imageName ?? inputValue : inputValue;
    return {
      inputType,
      value,
      readings: payloadReadings,
      whiteReference,
      metadata: {
        lighting,
        imageName,
      },
    };
  };

  const handleNormalize = async () => {
    setIsNormalizing(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/color/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!response.ok) throw new Error("Normalization failed");
      const data = (await response.json()) as NormalizationResult;
      setNormalized(data);
      await handleSolve(data.targetLab);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Normalization error");
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleSolve = async (lab: { l: number; a: number; b: number }) => {
    setIsSolving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/color/pigment-formula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLab: lab }),
      });
      if (!response.ok) throw new Error("Pigment solver failed");
      const data = (await response.json()) as PigmentFormulaResult;
      setPigmentResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pigment solver error");
    } finally {
      setIsSolving(false);
    }
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    setImageName(file.name);
    setInputType("image");
    setInputValue(file.name);
  };

  const toggleReading = (label: string) => {
    setSelectedReadings((prev) =>
      prev.includes(label) ? prev.filter((value) => value !== label) : [...prev, label]
    );
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const activeLab = normalized?.targetLab ?? { l: 59.3, a: 12.4, b: 25.3 };
  const activeHex = normalized?.hex ?? "#f0c7a1";
  const activeFormula = pigmentResult?.formula ?? fallbackFormula;
  const progressPercent = useMemo(() => {
    if (pigmentResult) return 100;
    if (normalized) return 65;
    return 20;
  }, [normalized, pigmentResult]);

  const finalLab = pigmentResult?.resultLab ?? activeLab;

  const downloadJson = () => {
    const payload = {
      lab: finalLab,
      hex: activeHex,
      source: inputType,
      readings: payloadReadings,
      formula: activeFormula.map((pigment) => ({ pigment: pigment.pigment, percentage: pigment.percentage.toFixed(1) })),
      deltaE: pigmentResult?.deltaE ?? 0,
      image: imageName,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aloure-formula.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt" });
    doc.setFont("Times", "Roman");
    doc.setFontSize(22);
    doc.text("Alouré · Custom Formula", 40, 60);
    doc.setFontSize(12);
    doc.text(`LAB: ${finalLab.l.toFixed(1)} / ${finalLab.a.toFixed(1)} / ${finalLab.b.toFixed(1)}`, 40, 90);
    doc.text(`HEX: ${activeHex}`, 40, 110);
    doc.text(`ΔE: ${(pigmentResult?.deltaE ?? 0).toFixed(2)}`, 40, 130);
    doc.text("Pigment breakdown:", 40, 160);
    activeFormula.forEach((pigment, index) => {
      doc.text(`${pigment.pigment}: ${pigment.percentage.toFixed(1)}%`, 60, 190 + index * 16);
    });
    doc.save("aloure-formula.pdf");
  };

  return (
    <main className="min-h-screen bg-ivory text-matteCharcoal">
      <section className="relative isolate overflow-hidden bg-soft-gradient px-6 pb-20 pt-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.4em] text-[#1e1b18]/80">Alouré atelier</p>
            <h1 className="font-serif text-4xl leading-tight text-matteCharcoal sm:text-5xl lg:text-6xl">
              Precision Color. Perfectly Yours.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-matteCharcoal/80">
              Luxury foundation crafting, guided by quiet color science. Upload skin data, calibrate lighting, and let the studio-grade
              solver return bespoke pigment ratios instantly.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                className="matte-button transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-glow"
                onClick={handleNormalize}
                disabled={isNormalizing || isSolving}
              >
                {isNormalizing ? "Analyzing…" : "Create Custom Foundation"}
              </button>
              <button className="rounded-full border border-[#1e1b18]/30 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#1e1b18]/80 transition hover:border-[#1e1b18]">
                Enter Color Code
              </button>
            </div>
            <div className="flex items-center gap-2 text-[0.8rem] uppercase tracking-[0.3em] text-[#1e1b18]/70">
              <span className="h-px w-10 bg-[#1e1b18]/40" />
              Powered by Color Science
            </div>
          </div>
          <div className="relative w-full max-w-sm rounded-3xl border border-white/60 bg-white/80 p-8 shadow-glow backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">Current Target</p>
                <p className="text-2xl font-serif text-[#1e1b18]">
                  L*: {activeLab.l.toFixed(1)} · a*: {activeLab.a.toFixed(1)} · b*: {activeLab.b.toFixed(1)}
                </p>
              </div>
              <div className="flex flex-col items-end text-xs uppercase tracking-[0.3em] text-[#1e1b18]/60">
                <span>Delta-E · {pigmentResult?.deltaE.toFixed(2) ?? "—"}</span>
                <span>Token · ALOR-001</span>
              </div>
            </div>
            <div className="mt-8">
              <div
                className="h-44 w-full rounded-3xl border border-[#c9a56a]/50 shadow-xl"
                style={{ background: `linear-gradient(135deg, ${activeHex} 0%, #ffffff 65%)` }}
              />
              <div className="mt-4 flex justify-between text-sm">
                <span>HEX · {activeHex}</span>
                <span>
                  LAB · {activeLab.l.toFixed(1)} / {activeLab.a.toFixed(1)} / {activeLab.b.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.5em] text-[#1e1b18]/50">Step-based workflow</p>
            <h2 className="font-serif text-3xl text-matteCharcoal">A couture process in four graceful steps</h2>
            <p className="max-w-2xl text-sm text-[#1e1b18]/70">
              From sensor or selfie to precise pigment formula, each screen walks you through the analysis so every match feels pampering,
              not clinical.
            </p>
          </div>
          <div className="hidden grid-cols-4 gap-6 lg:grid md:grid-cols-2">
            {timelineSteps.map((step) => (
              <div key={step.title} className="glass-panel border-glow rounded-3xl p-6 text-sm text-[#1e1b18]/70">
                <p className="text-xs uppercase tracking-[0.5em] text-[#1e1b18]/50">{step.title.split(" ")[0]}</p>
                <h3 className="mt-2 text-lg font-semibold text-matteCharcoal">{step.title}</h3>
                <p className="mt-3 text-[0.8rem] leading-relaxed text-[#1e1b18]/70">{step.description}</p>
              </div>
            ))}
          {error && (
            <div className="rounded-3xl border border-[#f97373]/40 bg-[#fff1f0] p-4 text-sm text-[#b91c1c]">
              {error}
            </div>
          )}

          </div>
          <div className="lg:hidden space-y-4">
            {timelineSteps.map((step, index) => (
              <details key={`${step.title}-${index}`} className="rounded-3xl border border-[#1e1b18]/20 bg-white/80 p-4 text-sm text-[#1e1b18]/70">
                <summary className="flex items-center justify-between text-sm font-semibold text-matteCharcoal">
                  <span>{step.title}</span>
                  <span className="text-[0.7rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">Step {index + 1}</span>
                </summary>
                <p className="mt-2 text-[0.75rem] text-[#1e1b18]/70">{step.description}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="hidden gap-6 lg:grid lg:grid-cols-3" role="tablist">
            {inputOptions.map((option) => (
              <div key={option.type} className="glass-panel rounded-3xl border border-white/60 bg-white/80 p-6 text-sm shadow">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">{option.type}</p>
                  <span className="text-[0.65rem] uppercase tracking-[0.4em] text-[#c9a56a]">{option.title}</span>
                </div>
                <p className="mt-3 text-xs text-[#1e1b18]/70">{option.helper}</p>
                {option.type === "image" && (
                  <label className="mt-6 flex cursor-pointer items-center justify-between rounded-2xl border border-[#1e1b18]/20 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1e1b18]/80">
                    <span>{imageName ?? "Choose JPG"}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
                {option.type === "manual" && (
                  <div className="mt-6 space-y-3">
                    <select
                      value={inputType}
                      onChange={(event) => setInputType(event.target.value as "hex" | "rgb" | "lab")}
                      className="w-full rounded-2xl border border-[#1e1b18]/15 px-3 py-2 text-xs"
                    >
                      <option value="hex">HEX</option>
                      <option value="rgb">RGB</option>
                      <option value="lab">LAB</option>
                    </select>
                    <input
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      className="w-full rounded-2xl border border-[#1e1b18]/15 px-3 py-2 text-sm"
                      placeholder="#f0c7a1 · 240,183,161 · 60.0,12.4,25.3"
                    />
                    <p className="text-[0.65rem] text-[#1e1b18]/60">Paste values and we auto-convert to CIELAB.</p>
                    <button
                      onClick={handleNormalize}
                      className="w-full rounded-2xl border border-[#1e1b18]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1e1b18]/80"
                      disabled={isNormalizing || isSolving}
                    >
                      {isNormalizing ? "Analyzing…" : "Analyze"}
                    </button>
                  </div>
                )}
                {option.type === "spectro" && (
                  <button className="mt-6 w-full rounded-2xl border border-[#1e1b18]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1e1b18]/80">
                    Sync Device
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="lg:hidden space-y-4">
            {inputOptions.map((option) => (
              <details key={option.type} className="rounded-3xl border border-[#1e1b18]/20 bg-white/80 p-4 text-sm text-[#1e1b18]/70">
                <summary className="flex items-center justify-between text-sm font-semibold text-matteCharcoal">
                  <span>{option.title}</span>
                  <span className="text-[0.65rem] uppercase tracking-[0.3em] text-[#1e1b18]/60">{option.type}</span>
                </summary>
                <p className="mt-2 text-[0.75rem] text-[#1e1b18]/70">{option.helper}</p>
                {option.type === "image" && (
                  <label className="mt-3 flex cursor-pointer rounded-2xl border border-[#1e1b18]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1e1b18]/80">
                    <span>{imageName ?? "Upload image"}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
                {option.type === "manual" && (
                  <div className="mt-3 space-y-2">
                    <select
                      value={inputType}
                      onChange={(event) => setInputType(event.target.value as "hex" | "rgb" | "lab")}
                      className="w-full rounded-2xl border border-[#1e1b18]/15 px-3 py-2 text-xs"
                    >
                      <option value="hex">HEX</option>
                      <option value="rgb">RGB</option>
                      <option value="lab">LAB</option>
                    </select>
                    <input
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      className="w-full rounded-2xl border border-[#1e1b18]/15 px-3 py-2 text-xs"
                      placeholder="#f0c7a1 · 240,183,161"
                    />
                    <button
                      onClick={handleNormalize}
                      className="w-full rounded-2xl border border-[#1e1b18]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1e1b18]/80"
                      disabled={isNormalizing || isSolving}
                    >
                      {isNormalizing ? "Analyzing…" : "Analyze"}
                    </button>
                  </div>
                )}
                {option.type === "spectro" && (
                  <button className="mt-3 w-full rounded-2xl border border-[#1e1b18]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1e1b18]/80">
                    Sync Device
                  </button>
                )}
              </details>
            ))}
          </div>

          <div className="space-y-4 rounded-3xl border border-[#1e1b18]/15 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">Readings</p>
            <div className="flex flex-wrap gap-3">
              {defaultReadings.map((reading) => (
                <button
                  key={reading.label}
                  onClick={() => toggleReading(reading.label)}
                  className={`rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                    selectedReadings.includes(reading.label)
                      ? "border-champagne bg-champagne/30 text-matteCharcoal"
                      : "border-[#1e1b18]/20 bg-white text-[#1e1b18]/60"
                  }`}
                >
                  {reading.label}
                </button>
              ))}
            </div>
            <p className="text-[0.7rem] text-[#1e1b18]/60">
              Selected readings feed the normalization payload, ensuring multiple zones contribute to the averaged tone.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-[#c9a56a]/40 bg-[#fffaf5]/80 p-5 text-sm">
              <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">Lighting calibration</p>
              <div className="mt-3 flex gap-3 text-sm">
                {[
                  { label: "Daylight", value: "daylight" },
                  { label: "Studio LED", value: "studio" },
                  { label: "Warm Tungsten", value: "warm" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setLighting(item.value)}
                    className={`rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                      lighting === item.value
                        ? "border-champagne bg-champagne/30 text-matteCharcoal"
                        : "border-transparent bg-white/70 text-[#1e1b18]/60"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-[0.7rem] text-[#1e1b18]/60">
                Use a white reference to anchor brightness and correct for ambient variation.
              </p>
              <div className="mt-3 space-y-2">
                <label className="text-[0.65rem] uppercase tracking-[0.3em] text-[#1e1b18]/60">White reference (LAB)</label>
                <div className="flex gap-2 text-[0.8rem] text-[#1e1b18]/80">
                  <input
                    type="number"
                    value={whiteReference.l}
                    onChange={(event) => setWhiteReference((prev) => ({ ...prev, l: Number(event.target.value) }))}
                    className="w-full rounded-2xl border border-[#1e1b18]/15 px-3 py-1"
                  />
                  <input
                    type="number"
                    value={whiteReference.a}
                    onChange={(event) => setWhiteReference((prev) => ({ ...prev, a: Number(event.target.value) }))}
                    className="w-full rounded-2xl border border-[#1e1b18]/15 px-3 py-1"
                  />
                  <input
                    type="number"
                    value={whiteReference.b}
                    onChange={(event) => setWhiteReference((prev) => ({ ...prev, b: Number(event.target.value) }))}
                    className="w-full rounded-2xl border border-[#1e1b18]/15 px-3 py-1"
                  />
                </div>
              </div>
            </div>
            <div className="glass-panel rounded-3xl p-8">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">Progress</p>
                <span className="rounded-full border border-[#c9a56a]/40 px-3 py-1 text-[0.65rem] uppercase tracking-[0.4em] text-[#c9a56a]">
                  {isSolving ? "Solving" : isNormalizing ? "Analyzing" : "Live"}
                </span>
              </div>
              <div className="mt-6 flex gap-4">
                <div className="flex h-36 w-36 items-center justify-center rounded-3xl border border-[#c9a56a]/30 bg-gradient-to-br from-[#fbeeea] to-[#f8d9c5]">
                  <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-[#f3c9b3] to-[#f7d6c8] shadow-lg" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-lg font-serif text-matteCharcoal">Skin tone stabilized</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#1e1b18]/80">
                    <span>LAB · {activeLab.l.toFixed(1)} / {activeLab.a.toFixed(1)} / {activeLab.b.toFixed(1)}</span>
                    <span className="h-px w-10 bg-[#1e1b18]/20" />
                    <span>HEX · {activeHex}</span>
                  </div>
                  <p className="text-xs text-[#1e1b18]/60">Analyzing tone… sensors converge on a single target.</p>
                  <div className="flex gap-2 text-[0.75rem]">
                    {[0, 1, 2].map((pulse) => (
                      <span
                        key={pulse}
                        className="h-2 w-2 rounded-full bg-[#1e1b18]/30 animate-pulse"
                        style={{ animationDelay: `${pulse * 200}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 h-2 rounded-full bg-[#1e1b18]/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#f7d166] via-[#f0b57a] to-[#1e1b18]" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[#1e1b18]/60">Workflow progress · {progressPercent}%</p>
            </div>
            <div className="glass-panel rounded-3xl p-8">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">Export</p>
                <span className="text-xs text-[#1e1b18]/60">Couture share</span>
              </div>
              <div className="mt-6 space-y-4">
                <p className="text-sm text-[#1e1b18]/70">Export the full formula as JSON for lab automation or as a PDF formula card.</p>
                <div className="flex flex-wrap gap-3">
                  <button className="matte-button text-[0.7rem] tracking-[0.4em]" onClick={downloadJson}>
                    Download JSON
                  </button>
                  <button
                    className="rounded-full border border-[#1e1b18]/30 px-4 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-[#1e1b18]/80"
                    onClick={downloadPdf}
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="glass-panel rounded-3xl p-8">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">Pigment formula</p>
                <span className="text-xs text-[#1e1b18]/60">ΔE · {(pigmentResult?.deltaE ?? 0).toFixed(2)}</span>
              </div>
              <div className="mt-6 space-y-4">
                {activeFormula.map((pigment) => (
                  <div key={pigment.pigment} className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-2xl"
                      style={{
                        background:
                          pigment.pigment === "Yellow"
                            ? "#f7d166"
                            : pigment.pigment === "Red"
                            ? "#e4696d"
                            : pigment.pigment === "White"
                            ? "#ffffff"
                            : pigment.pigment === "Black"
                            ? "#1e1b18"
                            : "#6da4d4",
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-matteCharcoal">{pigment.pigment}</p>
                      {pigment.description && <p className="text-xs text-[#1e1b18]/60">{pigment.description}</p>}
                    </div>
                    <p className="text-lg font-serif text-matteCharcoal">{pigment.percentage.toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel rounded-3xl p-8">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">Circular mix</p>
                <span className="rounded-full border border-[#c9a56a]/40 px-3 py-1 text-[0.65rem] uppercase tracking-[0.4em] text-[#c9a56a]">
                  Used pigments · {activeFormula.length}
                </span>
              </div>
              <div className="mt-6 flex items-center gap-6">
                <div
                  className="relative h-48 w-48 rounded-full"
                  style={{
                    background: `conic-gradient(#f7d166 0%, #e4696d 25%, #ffffff 55%, #1e1b18 75%, #6da4d4)`,
                  }}
                >
                  <div className="absolute inset-4 rounded-full bg-ivory" />
                  <div className="absolute inset-10 rounded-full bg-gradient-to-br from-[#f7d6c8] to-[#f3c9b3]" />
                </div>
                <div className="space-y-2 text-sm text-[#1e1b18]/70">
                  <p className="text-base font-semibold text-matteCharcoal">Blend ratio</p>
                  {activeFormula.map((pigment) => (
                    <p key={pigment.pigment}>
                      {pigment.pigment} · {pigment.percentage.toFixed(1)}%
                    </p>
                  ))}
                </div>
              </div>
              <p className="mt-6 text-xs text-[#1e1b18]/60">Each pigment carries a reference LAB signature. Solver respects non-negative, sum-to-100 constraints.</p>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8">
            <div className="grid gap-8 lg:grid-cols-[1.3fr,0.7fr]">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">Final result</p>
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-[#f3c9b3] to-[#f7d6c8] shadow-lg" />
                  <div>
                    <p className="text-lg font-serif text-matteCharcoal">Custom foundation ready</p>
                    <p className="text-sm text-[#1e1b18]/70">
                      LAB · {finalLab.l.toFixed(1)} / {finalLab.a.toFixed(1)} / {finalLab.b.toFixed(1)}
                    </p>
                    <p className="text-sm text-[#1e1b18]/70">HEX · {activeHex}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <button className="matte-button text-[0.7rem] tracking-[0.4em]">Generate Formula Sheet</button>
                  <button className="rounded-full border border-[#1e1b18]/30 px-4 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-[#1e1b18]/80">
                    Refine Match
                  </button>
                </div>
              </div>
              <div className="rounded-3xl border border-[#1e1b18]/10 bg-[#ffffff]/80 p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">Before · After</p>
                <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                  <div className="space-y-2 text-center">
                    <div className="h-12 w-12 rounded-full bg-[#f7d6c8]" />
                    <p className="text-xs text-[#1e1b18]/60">Original tone</p>
                  </div>
                  <div className="h-px flex-1 bg-[#1e1b18]/20" />
                  <div className="space-y-2 text-center">
                    <div className="h-12 w-12 rounded-full" style={{ background: activeHex }} />
                    <p className="text-xs text-[#1e1b18]/60">Final mix</p>
                  </div>
                </div>
                <p className="mt-4 text-[0.65rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">Confidence · Couture</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
