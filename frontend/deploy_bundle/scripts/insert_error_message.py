from pathlib import Path
path = Path('app/page.tsx')
text = path.read_text(encoding='utf-8')
marker = '          <div className="hidden gap-6 lg:grid lg:grid-cols-4 md:grid-cols-2"'
idx = text.index(marker)
insert = '''          {error && (
            <div className="rounded-3xl border border-[#f97373]/40 bg-[#fff1f0] p-4 text-sm text-[#b91c1c]">
              {error}
            </div>
          )}

'''
path.write_text(text[:idx] + insert + text[idx:], encoding='utf-8')
