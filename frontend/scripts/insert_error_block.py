from pathlib import Path
path = Path('app/page.tsx')
text = path.read_text(encoding='utf-8')
needle = '          </div>\n          <div className="lg:hidden space-y-4">'
idx = text.index(needle)
insert = '''          {error && (
            <div className="rounded-3xl border border-[#f97373]/40 bg-[#fff1f0] p-4 text-sm text-[#b91c1c]">
              {error}
            </div>
          )}

'''
text = text[:idx] + insert + text[idx:]
path.write_text(text, encoding='utf-8')
