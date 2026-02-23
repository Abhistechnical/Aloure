from pathlib import Path
path = Path('app/page.tsx')
text = path.read_text(encoding='utf-8')
old = 'className="grid gap-6 lg:grid-cols-4"'
if old not in text:
    raise ValueError('snippet not found')
text = text.replace(old, 'className="hidden gap-6 lg:grid lg:grid-cols-4"', 1)
path.write_text(text, encoding='utf-8')
