from pathlib import Path
text = Path('app/page.tsx').read_text(encoding='utf-8')
needle = '          <div className="grid gap-6 lg:grid-cols-4">'
print(needle in text)
print(text[text.find(needle)-20:text.find(needle)+80])
