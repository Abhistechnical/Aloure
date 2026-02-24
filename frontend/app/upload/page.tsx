"use client";

import { DragEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnalysis } from "../providers/analysis-provider";

export default function UploadPage() {
  const router = useRouter();
  const { setImageFile, imagePreview, imageFile, error } = useAnalysis();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (value?: File) => {
    if (!value) return;
    setImageFile(value);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const startAnalysis = () => {
    if (!imageFile) return;
    router.push("/analysis");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F3EE] px-6 py-12">
      <section className="mx-auto w-full max-w-4xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-[#1E1B18]/60">Capture</p>
          <h1 className="font-serif text-4xl text-[#1E1B18]">Upload your portrait to begin</h1>
          <p className="text-sm text-[#1E1B18]/70">
            Drag a JPG or PNG of your face. We sample forehead, cheek, and jawline, then gently translate pixels into couture LAB values.
          </p>
        </div>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border-2 border-dashed px-6 py-8 text-center transition ${
            dragging
              ? "border-[#c9a56a] bg-white"
              : "border-[#1E1B18]/20 bg-white/80 hover:border-[#c9a56a]"
          }`}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Portrait preview" className="h-full w-full rounded-[28px] object-cover" />
          ) : (
            <>
              <p className="text-lg font-semibold text-[#1E1B18]">Drop your image here</p>
              <p className="mt-2 text-sm text-[#1E1B18]/60">JPG or PNG · less than 8 MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />
          {imageFile && (
            <div className="pointer-events-none absolute bottom-5 right-5 rounded-full border border-white/70 bg-black/40 px-3 py-1 text-[0.65rem] text-white">
              {imageFile.name}
            </div>
          )}
        </div>
        {error && (
          <p className="text-center text-sm text-[#b91c1c]">{error}</p>
        )}
        <div className="flex justify-center">
          <button
            onClick={startAnalysis}
            disabled={!imageFile}
            className="rounded-full border border-transparent bg-[#1E1B18] px-10 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#F7F3EE] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Analyze
          </button>
        </div>
      </section>
    </main>
  );
}
