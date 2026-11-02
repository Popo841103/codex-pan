"""Refresh arrival-page markup from the existing community dialog; no duplicate form source."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
community=(root/'community.html').read_text(encoding='utf-8')
modal=re.search(r'<dialog id="host-event"[\s\S]*?</dialog>',community).group()
page=root/'today.html'
text=page.read_text(encoding='utf-8')
start='<!-- BEGIN SHARED MEMBER DIALOG -->'
end='<!-- END SHARED MEMBER DIALOG -->'
assert text.count(start)==text.count(end)==1
text=text.split(start)[0]+start+modal+end+text.split(end)[1]
page.write_text(text,encoding='utf-8')
print('Arrival dialog refreshed from community.html')
