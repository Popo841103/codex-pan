"""Validate shared form and deployment boundaries without real member writes."""
from pathlib import Path
from html.parser import HTMLParser
import re
root=Path(__file__).resolve().parents[1]
page=(root/'today.html').read_text(encoding='utf-8')
community=(root/'community.html').read_text(encoding='utf-8')
pattern=r'<dialog id="host-event"[\s\S]*?</dialog>'
assert re.search(pattern,page).group()==re.search(pattern,community).group(),'Shared modal drifted'
class Page(HTMLParser):
 def __init__(self): super().__init__(); self.ids=[]; self.src=[]; self.links=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='script':self.src.append(a.get('src'))
  if tag=='a':self.links.append(a.get('href'))
p=Page();p.feed(page)
assert len(p.ids)==len(set(p.ids)),'Duplicate element IDs'
assert '#host-event' in p.links
assert 'https://wa.me/60178497319' in p.links
assert p.src==['languages.js','today.js','member-config.js','host-event.js']
for file in p.src:assert (root/file).is_file()
assert '步行 5 分钟' in page and '步行 3 分钟' not in page
js=(root/'today.js').read_text(encoding='utf-8')
assert '[source=in_venue_screen]' in js
assert '.insert(' not in js and 'createClient' not in js,'Do not duplicate member API'
assert (root/'host-event.js').read_text(encoding='utf-8').count("from('cohub_events').insert(event)")==1
print('PASS: original dialog/scripts, unique IDs, existing API, provenance and five-minute walk')
