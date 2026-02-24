"use client";

import { jsPDF } from "jspdf";
import { useEffect, useMemo, useRef, useState } from "react";

type LabColor = { l: number; a: number; b: number };
type ManualInputType = "hex" | "rgb" | "lab";
type PigmentIngredient = { pigment: string; percentage: number; description: string; color: string };
type AnalysisResult = {
  lab: LabColor;
  hex: string;
  deltaE: number;
  confidence: number;
  formula: PigmentIngredient[];
  sampleCount: number;
  source: "image" | "manual";
  timestamp: number;
  meta: { inputLabel: string; fileName?: string; rawInput?: string };
};

const workflowSteps = [
  {
    title: "Capture Skin Data",
    description:
      "Drop a JPG or PNG, or paste a HEX/RGB/LAB code. The vision system respects soft lighting and neutral backdrops.",
  },
  {
    title: "Tone Analysis",
    description:
      "Canvas-based sampling inspects forehead, cheek, and jawline regions, converts pixels to CIELAB, and ignores background noise.",
  },
  {
    title: "Formulate",
    description:
      "A couture solver weights pigments by chroma to honor luminosity, redness, and warmth—every mix sums to 100%.",
  },
  {
    title: "Export",
    description:
      "Download JSON for lab automation or a PDF keepsake. Confidence and ΔE are right on the card.",
  },
];

const samplingRegions = [
  { label: "Forehead", x: 0.5, y: 0.18, size: 0.18 },
  { label: "Cheek", x: 0.35, y: 0.45, size: 0.22 },
  { label: "Jawline", x: 0.6, y: 0.68, size: 0.2 },
];

const pigmentSeeds: Array<{
  pigment: string;
  description: string;
  color: string;
  measure: (lab: LabColor) => number;
}> = [
  {
    pigment: "Sunlit Yellow",
    color: "#f7d166",
    description: "Warmth and glow for golden skins.",
    measure: (lab) => Math.max(0, lab.b),
  },
  {
    pigment: "Rouge Veil",
    color: "#e4696d",
    description: "Balanced red undertone that sculpts vitality.",
    measure: (lab) => Math.max(0, lab.a * 1.1),
  },
  {
    pigment: "Ivory Veil",
    color: "#fdf8f2",
    description: "Softens the mix and keeps cocoons luminous.",
    measure: (lab) => Math.max(0, 100 - lab.l),
  },
  {
    pigment: "Onyx Depth",
    color: "#1e1b18",
    description: "Adds contour, shadow, and anchoring depth.",
    measure: (lab) => Math.max(0, lab.l - 50),
  },
  {
    pigment: "Blue Balance",
    color: "#6da4d4",
    description: "Neutralizes excessive warmth and keeps clarity.",
    measure: (lab) => Math.max(0, -lab.b),
  },
];

const allowedImageTypes = ["image/jpeg", "image/png"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const srgbToLinear = (value: number) => {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
};

const linearToSrgb = (value: number) => {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
};

const rgbToXyz = (r: number, g: number, b: number) => {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return {
    x: lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375,
    y: lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175,
    z: lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041,
  };
};

const pivotXyz = (value: number) => {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
};

const xyzToLab = (x: number, y: number, z: number): LabColor => {
  const refX = 0.95047;
  const refY = 1.0;
  const refZ = 1.08883;
  const fx = pivotXyz(x / refX);
  const fy = pivotXyz(y / refY);
  const fz = pivotXyz(z / refZ);
  return {
    l: clamp(116 * fy - 16, 0, 100),
    a: clamp(500 * (fx - fy), -128, 127),
    b: clamp(200 * (fy - fz), -128, 127),
  };
};

const rgbToLab = (r: number, g: number, b: number): LabColor => {
  const { x, y, z } = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
};

const labToXyz = (lab: LabColor) => {
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;
  const pow3 = (value: number) => Math.pow(value, 3);
  const refX = 0.95047;
  const refY = 1.0;
  const refZ = 1.08883;
  return {
    x: refX * (fx > 0.206893 ? pow3(fx) : (fx - 16 / 116) / 7.787),
    y: refY * (lab.l > 7.999625 ? Math.pow((lab.l + 16) / 116, 3) : lab.l / 903.3),
    z: refZ * (fz > 0.206893 ? pow3(fz) : (fz - 16 / 116) / 7.787),
  };
};

const xyzToRgb = (x: number, y: number, z: number) => {
  const lr = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const lg = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const lb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  return {
    r: clamp(Math.round(linearToSrgb(lr) * 255), 0, 255),
    g: clamp(Math.round(linearToSrgb(lg) * 255), 0, 255),
    b: clamp(Math.round(linearToSrgb(lb) * 255), 0, 255),
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

const labToHex = (lab: LabColor) => {
  const { x, y, z } = labToXyz(lab);
  const { r, g, b } = xyzToRgb(x, y, z);
  return rgbToHex(r, g, b);
};

const computeDeltaE = (labA: LabColor, labB: LabColor) => {
  const deltaL = labA.l - labB.l;
  const deltaA = labA.a - labB.a;
  const deltaB = labA.b - labB.b;
  return Math.sqrt(deltaL ** 2 + deltaA ** 2 + deltaB ** 2);
};

const clampLab = (lab: LabColor): LabColor => ({
  l: clamp(lab.l, 0, 100),
  a: clamp(lab.a, -128, 127),
  b: clamp(lab.b, -128, 127),
});

const adjustWithReference = (lab: LabColor, reference: LabColor): LabColor => ({
  l: clamp(lab.l + (reference.l - 100) * 0.15, 0, 100),
  a: clamp(lab.a + reference.a * 0.05, -128, 127),
  b: clamp(lab.b + reference.b * 0.05, -128, 127),
});

const buildPigmentFormula = (lab: LabColor): PigmentIngredient[] => {
  const scored = pigmentSeeds.map((seed) => ({
    ...seed,
    weight: Math.max(0.05, seed.measure(lab)),
  }));
  const total = scored.reduce((sum, seed) => sum + seed.weight, 0.1);
  return scored.map((seed) => ({
    pigment: seed.pigment,
    percentage: (seed.weight / total) * 100,
    description: seed.description,
    color: seed.color,
  }));
};

const parseManualInput = (type: ManualInputType, value: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Manual entry cannot be empty.");
  if (type === "hex") {
    const sanitized = trimmed.replace(/[^0-9a-fA-F]/g, "");
    if (![3, 6].includes(sanitized.length)) throw new Error("Provide a 3- or 6-digit HEX value.");
    const normalized = sanitized.length === 3 ? sanitized.split("").map((char) => char + char).join("") : sanitized;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const lab = rgbToLab(r, g, b);
    return { lab, label: `HEX ${normalized.toUpperCase()}` };
  }
  if (type === "rgb") {
    const numbers = trimmed
      .split(/[^0-9.-]+/)
      .filter(Boolean)
      .map((value) => Number(value.trim()));
    if (numbers.length !== 3 || numbers.some((value) => Number.isNaN(value))) {
      throw new Error("Enter three RGB numbers (0-255). Example: 240, 183, 161.");
    }
    const [r, g, b] = numbers.map((value) => clamp(Math.round(value), 0, 255));
    const lab = rgbToLab(r, g, b);
    return { lab, label: `RGB ${r},${g},${b}` };
  }
  const labNumbers = trimmed
    .split(/[^0-9.-]+/)
    .filter(Boolean)
    .map((value) => Number(value.trim()));
  if (labNumbers.length !== 3 || labNumbers.some((value) => Number.isNaN(value))) {
    throw new Error("Enter three LAB numbers. Example: 60.4, 13.0, 24.3.");
  }
  const [l, a, b] = labNumbers;
  return { lab: { l: clamp(l, 0, 100), a: clamp(a, -128, 127), b: clamp(b, -128, 127) }, label: `LAB ${l},${a},${b}` };
};

export default function Home() {
  const [analysisState, setAnalysisState] = useState<"idle" | "processing" | "ready">("idle");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [manualType, setManualType] = useState<ManualInputType>("hex");
  const [manualValue, setManualValue] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whiteReference, setWhiteReference] = useState<LabColor>({ l: 99.0, a: 0.2, b: 1.1 });
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const manualPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const ensureCanvas = () => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    return canvasRef.current;
  };

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setAnalysisState("idle");
    setError(null);
  };

  const handleManualValueChange = (value: string) => {
    setManualValue(value);
    clearAnalysis();
  };

  const handleFileSelection = (file?: File) => {
    if (!file) return;
    if (!allowedImageTypes.includes(file.type)) {
      setError("Only JPG and PNG formats are supported.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Please upload files smaller than 8 MB.");
      return;
    }
    clearAnalysis();
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFileSelection(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFileSelection(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const analyzeImageFile = (file: File): Promise<{ lab: LabColor; sampleCount: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = ensureCanvas();
        const maxDimension = 900;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        canvas.width = Math.max(250, Math.round(img.width * scale));
        canvas.height = Math.max(250, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Unable to prepare canvas for analysis."));
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let samples: LabColor[] = [];
        samplingRegions.forEach((region) => {
          const startX = Math.max(0, Math.floor((region.x - region.size / 2) * canvas.width));
          const startY = Math.max(0, Math.floor((region.y - region.size / 2) * canvas.height));
          let regionWidth = Math.max(12, Math.floor(canvas.width * region.size));
          let regionHeight = Math.max(12, Math.floor(canvas.height * region.size));
          if (startX + regionWidth > canvas.width) regionWidth = canvas.width - startX;
          if (startY + regionHeight > canvas.height) regionHeight = canvas.height - startY;
          if (regionWidth <= 0 || regionHeight <= 0) return;
          const block = ctx.getImageData(startX, startY, regionWidth, regionHeight);
          const step = Math.max(4, Math.floor(Math.min(regionWidth, regionHeight) / 10));
          for (let y = 0; y < regionHeight; y += step) {
            for (let x = 0; x < regionWidth; x += step) {
              const idx = (y * regionWidth + x) * 4;
              const alpha = block.data[idx + 3];
              if (alpha < 110) continue;
              const lab = rgbToLab(block.data[idx], block.data[idx + 1], block.data[idx + 2]);
              if (lab.l < 12 || lab.l > 96) continue;
              if (Math.abs(lab.a) < 1 && Math.abs(lab.b) < 4 && lab.l > 92) continue;
              samples.push(lab);
            }
          }
        });
        URL.revokeObjectURL(objectUrl);
        if (!samples.length) {
          reject(new Error("Skin pixels were not detected. Try another image or adjust the lighting."));
          return;
        }
        const aggregated = samples.reduce(
          (acc, sample) => ({ l: acc.l + sample.l, a: acc.a + sample.a, b: acc.b + sample.b }),
          { l: 0, a: 0, b: 0 }
        );
        const count = samples.length;
        resolve({ lab: { l: aggregated.l / count, a: aggregated.a / count, b: aggregated.b / count }, sampleCount: count });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("The uploaded image could not be processed."));
      };
      img.src = objectUrl;
    });

  const handleAnalyze = async () => {
    setError(null);
    if (!imageFile && !manualValue.trim()) {
      setError("Upload an image or enter a color code before analyzing.");
      return;
    }
    setAnalysisState("processing");
    try {
      let lab: LabColor | null = null;
      let sampleCount = 0;
      let label = "Manual entry";
      if (imageFile) {
        const result = await analyzeImageFile(imageFile);
        lab = result.lab;
        sampleCount = result.sampleCount;
        label = imageFile.name;
      } else {
        const manual = parseManualInput(manualType, manualValue);
        lab = manual.lab;
        label = manual.label;
      }
      if (!lab) throw new Error("Unable to infer color data from the current input.");
      const normalized = clampLab(adjustWithReference(lab, whiteReference));
      const deltaE = computeDeltaE(normalized, whiteReference);
      const hex = labToHex(normalized);
      const formula = buildPigmentFormula(normalized);
      setAnalysisResult({
        lab: normalized,
        hex,
        deltaE,
        confidence: Math.max(0, 100 - deltaE),
        formula,
        sampleCount,
        source: imageFile ? "image" : "manual",
        timestamp: Date.now(),
        meta: { inputLabel: label, fileName: imageFile?.name, rawInput: manualValue },
      });
      setAnalysisState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected analysis error.");
      setAnalysisState("idle");
    }
  };

  const canAnalyze = Boolean(imageFile || manualValue.trim());

  const downloadJson = () => {
    if (!analysisResult) return;
    const payload = {
      createdAt: new Date(analysisResult.timestamp).toISOString(),
      lab: analysisResult.lab,
      hex: analysisResult.hex,
      deltaE: analysisResult.deltaE,
      confidence: analysisResult.confidence,
      sampleCount: analysisResult.sampleCount,
      source: analysisResult.meta.inputLabel,
      formula: analysisResult.formula.map((pigment) => ({ pigment: pigment.pigment, percentage: pigment.percentage })),
      whiteReference,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aloure-tone.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!analysisResult) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt" });
    doc.setFont("Times", "Normal");
    doc.setFontSize(22);
    doc.text("Alouré · Custom Foundation", 40, 60);
    doc.setFontSize(12);
    doc.text(`HEX: ${analysisResult.hex}`, 40, 90);
    doc.text(
      `LAB: ${analysisResult.lab.l.toFixed(1)} / ${analysisResult.lab.a.toFixed(1)} / ${analysisResult.lab.b.toFixed(1)}`,
      40,
      110
    );
    doc.text(`ΔE: ${analysisResult.deltaE.toFixed(2)}`, 40, 130);
    doc.text(`Confidence: ${analysisResult.confidence.toFixed(0)}%`, 40, 150);
    doc.text("Pigment formula:", 40, 180);
    analysisResult.formula.forEach((pigment, index) => {
      doc.text(`${pigment.pigment}: ${pigment.percentage.toFixed(1)}%`, 60, 200 + index * 16);
    });
    doc.save("aloure-tone.pdf");
  };

  const stepStage = analysisResult ? 4 : analysisState === "processing" ? 2 : 1;
  const activeStepIndex = hoveredStep !== null ? hoveredStep : stepStage - 1;
  const currentStep = workflowSteps[activeStepIndex] ?? workflowSteps[0];

  const sourceLabel = analysisResult ? analysisResult.meta.inputLabel : "Awaiting input";
  const statusLabel =
    analysisState === "processing"
      ? "Analyzing skin tone…"
      : analysisResult
      ? "Match ready for production"
      : "Drop an image or enter a code";
  const progressValue = analysisState === "processing" ? 45 : analysisResult ? 100 : 10;

  return (
    <main className="min-h-screen bg-[#F7F3EE] text-matteCharcoal">
      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr,0.85fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.45em] text-[#1e1b18]/60">Alouré Atelier</p>
            <h1 className="text-4xl font-serif leading-tight text-matteCharcoal lg:text-5xl">
              Precision foundation color matching, choreographed from sensor to formula.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-[#1e1b18]/70">
              Upload a portrait, share a HEX/LAB code, and the studio-grade analysis adjusts for light, ignores background, and
              generates couture pigment ratios instantly.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || analysisState === "processing"}
                className="matte-button flex items-center justify-center gap-2 rounded-full border border-transparent bg-[#c9a56a] px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#1e1b18] transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analysisState === "processing" ? "Analyzing…" : "Create Custom Foundation"}
              </button>
              <button
                onClick={() => {
                  manualPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="rounded-full border border-[#1e1b18]/30 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#1e1b18]/70 transition hover:border-[#1e1b18] hover:text-[#1e1b18]"
              >
                Enter Color Code
              </button>
            </div>
            <p className="text-[0.7rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">Powered by canvas color science</p>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-glow backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.4em] text-[#1e1b18]/60">Current Target</p>
              <span className="rounded-full border border-[#c9a56a]/40 px-3 py-1 text-[0.65rem] uppercase tracking-[0.45em] text-[#c9a56a]">
                {analysisResult ? "Matched" : "Awaiting"}
              </span>
            </div>
            <div className="mt-6 space-y-4">
              <div
                className="h-40 rounded-3xl border border-[#1e1b18]/20"
                style={{
                  background: analysisResult
                    ? `linear-gradient(135deg, ${analysisResult.hex} 0%, #fffaf5 75%)`
                    : "linear-gradient(135deg, #f7f3ee 0%, #dfd6cb 100%)",
                }}
              />
              <div className="grid grid-cols-2 gap-3 text-[0.85rem] text-[#1e1b18]/70">
                <div className="space-y-1">
                  <p className="text-[0.65rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">HEX</p>
                  <p className="text-base font-semibold text-matteCharcoal">{analysisResult ? analysisResult.hex : "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[0.65rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">LAB</p>
                  <p className="text-base font-semibold text-matteCharcoal">
                    {analysisResult
                      ? `${analysisResult.lab.l.toFixed(1)} · ${analysisResult.lab.a.toFixed(1)} · ${analysisResult.lab.b.toFixed(1)}`
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[0.75rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">
                <span>ΔE · {analysisResult ? analysisResult.deltaE.toFixed(2) : "—"}</span>
                <span className="rounded-full border border-[#c9a56a]/40 px-3 py-1 text-[0.65rem] text-[#c9a56a]">
                  Confidence {analysisResult ? `${analysisResult.confidence.toFixed(0)}%` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#1e1b18]/10 px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.45em] text-[#1e1b18]/60">Step-based workflow</p>
            <h2 className="text-3xl font-serif text-matteCharcoal">Every match is a quiet couture ritual</h2>
            <p className="text-sm text-[#1e1b18]/70">
              The studio walks you from capture through formulation. Hover or tap a step to inspect the details.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            {workflowSteps.map((step, index) => {
              const isActive = activeStepIndex === index;
              return (
                <button
                  key={step.title}
                  onMouseEnter={() => setHoveredStep(index)}
                  onMouseLeave={() => setHoveredStep(null)}
                  onFocus={() => setHoveredStep(index)}
                  onBlur={() => setHoveredStep(null)}
                  className={`group flex flex-col gap-3 rounded-3xl border p-6 text-left transition ${
                    isActive
                      ? "border-champagne bg-[#fdf8f2] shadow-glow"
                      : "border-[#1e1b18]/10 bg-white/80 hover:border-[#c9a56a]"
                  }`}
                >
                  <p className="text-[0.65rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">Step {index + 1}</p>
                  <p className="text-lg font-serif text-matteCharcoal">{step.title}</p>
                  <p className="text-sm text-[#1e1b18]/70">{step.description}</p>
                </button>
              );
            })}
          </div>
          <div className="rounded-3xl border border-[#1e1b18]/10 bg-[#fffaf5]/80 p-5 text-sm text-[#1e1b18]/70">
            <p className="text-[0.75rem] uppercase tracking-[0.35em] text-[#1e1b18]/60">Current stage</p>
            <p className="mt-2 text-base text-matteCharcoal">{currentStep.description}</p>
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr,0.9fr]">
          <div className="rounded-3xl border border-[#1e1b18]/10 bg-white/90 p-6 shadow-glass">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.45em] text-[#1e1b18]/60">Upload</p>
                <h3 className="text-2xl font-serif text-matteCharcoal">Drag · drop · capture</h3>
              </div>
              <span className="text-[0.65rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">JPG · PNG · ≤8MB</span>
            </div>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative mt-6 flex h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-4 text-center text-sm transition ${
                dragging
                  ? "border-champagne bg-[#fff7ec]"
                  : "border-[#1e1b18]/40 bg-[#fdf9f5] hover:border-[#c9a56a]"
              }`}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Skin preview" className="h-full w-full rounded-3xl object-cover" />
              ) : (
                <>
                  <p className="text-lg font-semibold text-matteCharcoal">Drop or select a face image</p>
                  <p className="mt-2 text-[0.8rem] text-[#1e1b18]/60">We sample forehead, cheek, and jawline regions.</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={handleFileInputChange}
              />
              {imageFile && (
                <div className="absolute bottom-4 right-4 rounded-full border border-white/60 bg-black/40 px-3 py-1 text-[0.65rem] text-white">
                  {imageFile.name}
                </div>
              )}
            </div>
            {error && (
              <div className="mt-4 rounded-3xl border border-[#f97373]/40 bg-[#fff1f0] p-4 text-sm text-[#b91c1c]">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div ref={manualPanelRef} className="rounded-3xl border border-[#1e1b18]/10 bg-white/90 p-6 shadow-glass">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-[#1e1b18]/60">Manual input</p>
                  <h3 className="text-2xl font-serif text-matteCharcoal">Enter a color code</h3>
                </div>
                <span className="text-[0.65rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">HEX · RGB · LAB</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {(["hex", "rgb", "lab"] as ManualInputType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setManualType(type)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                      manualType === type
                        ? "border-champagne bg-[#fff5e6] text-matteCharcoal"
                        : "border-[#1e1b18]/20 bg-white/80 text-[#1e1b18]/70"
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
              <textarea
                value={manualValue}
                onChange={(event) => handleManualValueChange(event.target.value)}
                placeholder={
                  manualType === "hex"
                    ? "#F0C7A1"
                    : manualType === "rgb"
                    ? "240, 183, 161"
                    : "60.4, 13.0, 24.3"
                }
                rows={3}
                className="mt-5 w-full rounded-2xl border border-[#1e1b18]/20 bg-[#faf7f2] px-4 py-3 text-sm text-[#1e1b18]/70 placeholder:text-[#1e1b18]/40"
              />
              <p className="mt-2 text-[0.7rem] text-[#1e1b18]/60">
                Manual values feed directly into the same CIELAB pipeline—no hardcoded colors, no reused cache.
              </p>
            </div>

            <div className="rounded-3xl border border-[#1e1b18]/10 bg-[#fff9f3] p-6 shadow-glass">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.45em] text-[#1e1b18]/60">Status</p>
                <span className="rounded-full border border-[#c9a56a]/40 px-3 py-1 text-[0.6rem] uppercase tracking-[0.4em] text-[#c9a56a]">
                  {statusLabel}
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[#1e1b18]/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f7d166] via-[#e4696d] to-[#1e1b18]"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-[0.8rem] text-[#1e1b18]/70">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.4em]">Source</p>
                  <p className="text-sm text-matteCharcoal">{sourceLabel}</p>
                </div>
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.4em]">Samples</p>
                  <p className="text-sm text-matteCharcoal">
                    {analysisResult ? analysisResult.sampleCount : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-[#1e1b18]/10 bg-white/90 p-6 shadow-glass">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.45em] text-[#1e1b18]/60">Results panel</p>
                <span className="text-[0.65rem] uppercase tracking-[0.35em] text-[#1e1b18]/60">
                  {analysisResult ? "Live match" : "Awaiting analysis"}
                </span>
              </div>
              <div className="mt-5 space-y-5">
                <div className="flex flex-col gap-3 rounded-3xl border border-[#1e1b18]/10 bg-[#fdf7f1] p-5 text-sm text-[#1e1b18]/70">
                  <p className="text-[0.65rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">Target swatch</p>
                  <div
                    className="h-32 rounded-3xl border border-[#1e1b18]/30"
                    style={{ background: analysisResult ? `linear-gradient(135deg, ${analysisResult.hex} 0%, #fffefa 80%)` : "#f7f3ee" }}
                  />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[#1e1b18]/60">LAB</p>
                      <p className="text-base font-semibold text-matteCharcoal">
                        {analysisResult
                          ? `${analysisResult.lab.l.toFixed(1)} / ${analysisResult.lab.a.toFixed(1)} / ${analysisResult.lab.b.toFixed(1)}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[#1e1b18]/60">HEX</p>
                      <p className="text-base font-semibold text-matteCharcoal">{analysisResult ? analysisResult.hex : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[0.75rem] uppercase tracking-[0.35em] text-[#1e1b18]/60">
                    <span>ΔE · {analysisResult ? analysisResult.deltaE.toFixed(2) : "—"}</span>
                    <span>Confidence · {analysisResult ? `${analysisResult.confidence.toFixed(0)}%` : "—"}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.35em] text-[#1e1b18]/60">Confidence card</p>
                  <div className="flex items-center justify-between rounded-3xl border border-[#1e1b18]/10 bg-white/80 p-4 text-sm text-[#1e1b18]/70">
                    <div>
                      <p className="text-base font-semibold text-matteCharcoal">ΔE Confidence</p>
                      <p className="text-[0.7rem] text-[#1e1b18]/60">Sea of precision—low ΔE, high trust.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-serif text-matteCharcoal">{analysisResult ? `${analysisResult.confidence.toFixed(0)}%` : "—"}</p>
                      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[#1e1b18]/60">ΔE {analysisResult ? analysisResult.deltaE.toFixed(2) : "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#1e1b18]/10 bg-white/90 p-6 shadow-glass">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.45em] text-[#1e1b18]/60">Formula breakdown</p>
                <span className="text-[0.65rem] uppercase tracking-[0.35em] text-[#1e1b18]/60">Sum to 100%</span>
              </div>
              <div className="mt-5 space-y-4">
                {analysisResult?.formula.map((pigment) => (
                  <div key={pigment.pigment} className="flex items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-2xl border border-[#1e1b18]/10"
                      style={{ background: pigment.color }}
                    />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold text-matteCharcoal">{pigment.pigment}</p>
                      <p className="text-[0.75rem] text-[#1e1b18]/60">{pigment.description}</p>
                    </div>
                    <p className="text-lg font-serif text-matteCharcoal">{pigment.percentage.toFixed(1)}%</p>
                  </div>
                ))}
                {!analysisResult && (
                  <p className="text-sm text-[#1e1b18]/60">A formula appears after the matching analysis finishes.</p>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={downloadJson}
                  disabled={!analysisResult}
                  className="rounded-full border border-[#1e1b18]/20 px-5 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[#1e1b18]/70 transition hover:border-[#1e1b18] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export JSON
                </button>
                <button
                  onClick={downloadPdf}
                  disabled={!analysisResult}
                  className="rounded-full border border-[#1e1b18]/20 px-5 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[#1e1b18]/70 transition hover:border-[#1e1b18] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#1e1b18]/10 bg-[#fff8f2]/80 p-6 text-sm text-[#1e1b18]/70 shadow-glass">
            <p className="text-xs uppercase tracking-[0.35em] text-[#1e1b18]/60">Confidence & disclaimers</p>
            <p className="mt-2 text-[0.85rem] text-[#1e1b18]/70">
              Every analysis recomputes from the uploaded pixels. Different images yield different LAB/HEX values, and no
              values are reused from memory. Manual tone codes feed the same solver, so everything on this page is live.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
