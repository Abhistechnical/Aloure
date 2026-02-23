from pathlib import Path
text = Path('app/page.tsx').read_text(encoding='utf-8')
needle = 'error &&'
idx = text.find(needle)
print(idx)
print(text[idx-40:idx+80])
