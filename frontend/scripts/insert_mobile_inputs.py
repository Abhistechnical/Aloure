from pathlib import Path
path = Path('app/page.tsx')
text = path.read_text(encoding='utf-8')
needle = '              <div className="mt-8 grid gap-3 md:grid-cols-3">'
if needle not in text:
    raise ValueError('needle not found')
insert = '''              <div className="mt-6 space-y-3 md:hidden">
                {inputOptions.map((option) => (
                  <details key={option.type} className="rounded-3xl border border-[#1e1b18]/20 bg-white/80 p-4 text-sm text-[#1e1b18]/70">
                    <summary className="flex items-center justify-between text-sm font-semibold text-matteCharcoal">
                      <span>{option.label}</span>
                      <span className="text-[0.65rem] uppercase tracking-[0.3em] text-[#1e1b18]/60">{option.type}</span>
                    </summary>
                    <p className="mt-2 text-[0.75rem] text-[#1e1b18]/70">{option.helper}</p>
                    {option.type === "image" && (
                      <label className="mt-3 flex cursor-pointer rounded-2xl border border-[#1e1b18]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1e1b18]/80">
                        <span>Upload</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                    {option.type === "manual" && (
                      <div className="mt-3 space-y-2">
                        <select
                          value={inputType}
                          onChange={(event) => setInputType(event.target.value)}
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

'''
path.write_text(text.replace(needle, insert + needle, 1), encoding='utf-8')
