from pathlib import Path
text = Path('app/page.tsx').read_text(encoding='utf-8')
idx = text.find('grid gap-6')
print('idx', idx)
if idx >= 0:
    print(text[idx-40:idx+40])
