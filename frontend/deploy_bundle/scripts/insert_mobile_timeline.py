from pathlib import Path
path = Path('app/page.tsx')
text = path.read_text(encoding='utf-8')
needle = '          {error && ('
idx = text.index(needle)
insert = '''
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
path.write_text(text[:idx] + insert + text[idx:], encoding='utf-8')
