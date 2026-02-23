from pathlib import Path
text = Path('app/page.tsx').read_text(encoding='utf-8')
needle = 'Step-based workflow'
idx = text.find(needle)
print(idx)
print(text[idx-200:idx+400])
