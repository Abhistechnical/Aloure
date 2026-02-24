"use client";

import { jsPDF } from "jspdf";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type LabColor = { l: number; a: number; b: number };
type PigmentIngredient = { pigment: string; percentage: number; description: string; color: string };

type AnalysisResult = {
  lab: LabColor;
  hex: string;
  deltaE: number;
  confidence: number;
  formula: PigmentIngredient[];
  sampleCount: number;
  shadeName: string;
  timestamp: number;
};

type AnalysisStatus = "idle" | "processing" | "ready";

type AnalysisContextValue = {
  imageFile: File | null;
  imagePreview: string | null;
  status: AnalysisStatus;
  result: AnalysisResult | null;
  error: string | null;
  setImageFile: (file: File | null) => void;
  startAnalysis: () => Promise<void>;
  reset: () => void;
  downloadJson: () => void;
  downloadPdf: () => void;
};

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

const allowedImageTypes = ["image/jpeg", "image/png"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const WHITE_REFERENCE: LabColor = { l: 99, a: 0.15, b: 1.15 };

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

const pivotXyz = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);

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

const rgbToLab = (r: number, g: number, b: number) => {
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

const rgbToHex = (r: number, g: number, b: number) => {
  const hex = [r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return "#" + hex.toUpperCase();
};

const labToHex = (lab: LabColor) => {
  const { x, y, z } = labToXyz(lab);
  const { r, g, b } = xyzToRgb(x, y, z);
  return rgbToHex(r, g, b);
};

const clampLab = (lab: LabColor): LabColor => ({
  l: clamp(lab.l, 0, 100),
  a: clamp(lab.a, -128, 127),
  b: clamp(lab.b, -128, 127),
});

const computeDeltaE = (labA: LabColor, labB: LabColor) => {
  const deltaL = labA.l - labB.l;
  const deltaA = labA.a - labB.a;
  const deltaB = labA.b - labB.b;
  return Math.sqrt(deltaL ** 2 + deltaA ** 2 + deltaB ** 2);
};

const pigmentSeeds = [
  { pigment: "Yellow", color: "#f7d166", description: "Warms the mix with couture luminosity." },
  { pigment: "Red", color: "#e4696d", description: "Rose gold undertones for healthy radiance." },
  { pigment: "White", color: "#fdf8f2", description: "Lifts and softens for a satin finish." },
  { pigment: "Black", color: "#1e1b18", description: "Adds contour depth without harshness." },
  { pigment: "Blue", color: "#6da4d4", description: "Neutralizes warmth for a balanced glow." },
];

const buildPigmentFormula = (lab: LabColor): PigmentIngredient[] => {
  const scored = pigmentSeeds.map((seed, index) => {
    const weight = (() => {
      if (index === 0) return Math.max(0.05, lab.b / 30);
      if (index === 1) return Math.max(0.05, lab.a / 20);
      if (index === 2) return Math.max(0.05, (100 - lab.l) / 30);
      if (index === 3) return Math.max(0.05, (lab.l - 50) / 40);
      return Math.max(0.05, -lab.b / 20);
    })();
    return { ...seed, weight };
  });
  const total = scored.reduce((acc, seed) => acc + seed.weight, 0.1);
  return scored.map((seed) => ({
    pigment: seed.pigment,
    description: seed.description,
    color: seed.color,
    percentage: (seed.weight / total) * 100,
  }));
};

const adjustWithReference = (lab: LabColor, reference: LabColor): LabColor => ({
  l: clamp(lab.l + (reference.l - 100) * 0.15, 0, 100),
  a: clamp(lab.a + reference.a * 0.05, -128, 127),
  b: clamp(lab.b + reference.b * 0.05, -128, 127),
});

const shadeDescriptor = (lab: LabColor) => {
  const brightness = lab.l > 70 ? "Luminous" : lab.l > 55 ? "Radiant" : lab.l > 40 ? "Velvet" : "Nocturne";
  const warmth = lab.b > 12 ? "Dawn" : lab.b < -12 ? "Mist" : "Silk";
  const depth = lab.a > 8 ? "Rose" : lab.a < -8 ? "Cool" : "Neutral";
  return [brightness, depth, warmth].join(" ");
};

const analyzeImageFile = (file: File, canvas: HTMLCanvasElement): Promise<{ lab: LabColor; sampleCount: number }> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxDim = 900;
      const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
      canvas.width = Math.max(320, Math.round(image.width * scale));
      canvas.height = Math.max(320, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to prepare canvas."));
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const regions = [
        { x: 0.5, y: 0.2, size: 0.18 },
        { x: 0.35, y: 0.45, size: 0.22 },
        { x: 0.65, y: 0.65, size: 0.2 },
      ];
      const samples: LabColor[] = [];
      regions.forEach((region) => {
        const startX = Math.max(0, Math.floor((region.x - region.size / 2) * canvas.width));
        const startY = Math.max(0, Math.floor((region.y - region.size / 2) * canvas.height));
        let regionWidth = Math.max(12, Math.floor(canvas.width * region.size));
        let regionHeight = Math.max(12, Math.floor(canvas.height * region.size));
        if (startX + regionWidth > canvas.width) regionWidth = canvas.width - startX;
        if (startY + regionHeight > canvas.height) regionHeight = canvas.height - startY;
        if (regionWidth <= 0 || regionHeight <= 0) return;
        const data = ctx.getImageData(startX, startY, regionWidth, regionHeight);
        const step = Math.max(4, Math.floor(Math.min(regionWidth, regionHeight) / 12));
        for (let y = 0; y < regionHeight; y += step) {
          for (let x = 0; x < regionWidth; x += step) {
            const idx = (y * regionWidth + x) * 4;
            const alpha = data.data[idx + 3];
            if (alpha < 120) continue;
            const lab = rgbToLab(data.data[idx], data.data[idx + 1], data.data[idx + 2]);
            if (lab.l < 10 || lab.l > 98) continue;
            if (Math.abs(lab.a) < 2 && Math.abs(lab.b) < 4 && lab.l > 92) continue;
            samples.push(lab);
          }
        }
      });
      URL.revokeObjectURL(objectUrl);
      if (!samples.length) {
        reject(new Error("Skin tone could not be detected. Please try a different image."));
        return;
      }
      const aggregated = samples.reduce(
        (acc, sample) => ({ l: acc.l + sample.l, a: acc.a + sample.a, b: acc.b + sample.b }),
        { l: 0, a: 0, b: 0 }
      );
      const count = samples.length;
      resolve({ lab: { l: aggregated.l / count, a: aggregated.a / count, b: aggregated.b / count }, sampleCount: count });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The uploaded image could not be read."));
    };
    image.src = objectUrl;
  });

export const AnalysisProvider = ({ children }: { children: ReactNode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageFile, setImageFileState] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
  }, []);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const setImageFile = (file: File | null) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setAnalysisResult(null);
    setStatus("idle");
    setError(null);
    if (!file) {
      setImageFileState(null);
      setImagePreview(null);
      return;
    }
    if (!allowedImageTypes.includes(file.type)) {
      setError("Only JPG and PNG files are supported.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Please upload files smaller than 8 MB.");
      return;
    }
    const preview = URL.createObjectURL(file);
    setImageFileState(file);
    setImagePreview(preview);
  };

  const startAnalysis = async () => {
    if (!imageFile) {
      setError("Upload an image before analyzing.");
      return;
    }
    if (status === "processing") return;
    setStatus("processing");
    setError(null);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      const { lab, sampleCount } = await analyzeImageFile(imageFile, canvas);
      const normalized = clampLab(adjustWithReference(lab, WHITE_REFERENCE));
      const hex = labToHex(normalized);
      const deltaE = computeDeltaE(normalized, WHITE_REFERENCE);
      const formula = buildPigmentFormula(normalized);
      setAnalysisResult({
        lab: normalized,
        hex,
        deltaE,
        confidence: Math.max(0, 100 - deltaE),
        formula,
        sampleCount,
        shadeName: shadeDescriptor(normalized),
        timestamp: Date.now(),
      });
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze the image.");
      setStatus("idle");
    }
  };

  const reset = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFileState(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setStatus("idle");
    setError(null);
  };

  const downloadJson = () => {
    if (!analysisResult) return;
    const payload = {
      createdAt: new Date(analysisResult.timestamp).toISOString(),
      lab: analysisResult.lab,
      hex: analysisResult.hex,
      deltaE: analysisResult.deltaE,
      confidence: analysisResult.confidence,
      sampleCount: analysisResult.sampleCount,
      shade: analysisResult.shadeName,
      formula: analysisResult.formula.map((pigment) => ({ pigment: pigment.pigment, percentage: pigment.percentage })),
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
    doc.text("Alouré Atelier · Custom Foundation", 40, 60);
    doc.setFontSize(12);
    doc.text("Shade: " + analysisResult.shadeName, 40, 90);
    doc.text("HEX: " + analysisResult.hex, 40, 110);
    doc.text(
      "LAB: " +
        analysisResult.lab.l.toFixed(1) +
        " / " +
        analysisResult.lab.a.toFixed(1) +
        " / " +
        analysisResult.lab.b.toFixed(1),
      40,
      130
    );
    doc.text("ΔE: " + analysisResult.deltaE.toFixed(2), 40, 150);
    doc.text("Confidence: " + analysisResult.confidence.toFixed(0) + "%", 40, 170);
    doc.text("Pigment formula:", 40, 200);
    analysisResult.formula.forEach((pigment, index) => {
      doc.text(pigment.pigment + ": " + pigment.percentage.toFixed(1) + "%", 60, 220 + index * 18);
    });
    doc.save("aloure-tone.pdf");
  };

  return (
    <AnalysisContext.Provider
      value={{
        imageFile,
        imagePreview,
        status,
        result: analysisResult,
        error,
        setImageFile,
        startAnalysis,
        reset,
        downloadJson,
        downloadPdf,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within AnalysisProvider");
  }
  return context;
};
