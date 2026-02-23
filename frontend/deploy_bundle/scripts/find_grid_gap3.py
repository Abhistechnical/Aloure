from pathlib import Path
text = Path('app/page.tsx').read_text(encoding='utf-8')
needle = 'mt-8 grid gap-3 md:grid-cols-3'
idx = text.find(needle)
print(idx)
if idx >= 0:
    print(text[idx-50:idx+150])
