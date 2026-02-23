from pathlib import Path
path = Path(__file__).parent.parent / "app" / "page.tsx"
text = path.read_text(encoding="utf-8")
needle = '          <div className="grid gap-6 lg:grid-cols-4">'
start = text.index(needle)
end = text.index('          {error && (', start)
newblock = '''
          <div className="hidden grid gap-6 lg:grid-cols-4 md:grid-cols-2">
            {timelineSteps.map((title, index) => (
              <div key={title} className="glass-panel border-glow rounded-3xl p-6 text-sm text-[#1e1b18]/70">
                <p className="text-xs uppercase tracking-[0.5em] text-[#1e1b18]/50">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold text-matteCharcoal">{title}</h3>
                <p className="mt-3 text-[0.85rem] leading-relaxed text-[#1e1b18]/70">
                  {(index === 0 && "Collect readings from jawline, cheek and forehead with optional spectro input.") ||
                    (index === 1 && "Calibrate for light, normalize within CIELAB, and preview the averaged swatch.") ||
                    (index === 2 && "Solver returns pigment ratios with ΔE confidence, visualized as creamy swatches.") ||
                    (index === 3 && "Confirm codes, download the formula sheet and reveal before/after comparison.")}
                </p>
              </div>
            ))}
          </div>

          <div className="md:hidden space-y-4">
            {timelineSteps.map((title, index) => (
              <details key={`${title}-mobile`} className="rounded-3xl border border-[#1e1b18]/20 bg-white/80 p-4 text-sm text-[#1e1b18]/70">
                <summary className="flex items-center justify-between text-sm font-semibold text-matteCharcoal">
                  <span>{title}</span>
                  <span className="text-[0.7rem] uppercase tracking-[0.4em] text-[#1e1b18]/60">Step {index + 1}</span>
                </summary>
                <p className="mt-2 text-[0.75rem] text-[#1e1b18]/70">
                  {(index === 0 && "Capture jawline, cheek and forehead readings with supported devices.") ||
                    (index === 1 && "Normalize across lighting, then preview the averaged CIELAB tone.") ||
                    (index === 2 && "Solver calculates pigment ratios with a soft visual summary.") ||
                    (index === 3 && "Finalize the hex/LAB codes and export the couture formula.")}
                </p>
              </details>
            ))}
          </div>

'''
path.write_text(text[:start] + newblock + text[end:], encoding="utf-8")
