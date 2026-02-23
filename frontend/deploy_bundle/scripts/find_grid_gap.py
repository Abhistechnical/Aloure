from pathlib import Path
text = Path('app/page.tsx').read_text(encoding='utf-8')
needle = 'grid gap'
idx = text.find(needle)
print('idx', idx)
print(text[idx-20:idx+60])
