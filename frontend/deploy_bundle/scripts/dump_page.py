from pathlib import Path
text = Path('app/page.tsx').read_text(encoding='utf-8')
print(text[:800])
