"""Reject missing prewritten translations before publishing the website."""
from html.parser import HTMLParser
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[2]
LANGS=['zh-TW','ja','ko','th','id','vi','fr','de','es','pt','ru','ar','hi','it','nl','tr']
def norm(s):return ' '.join(s.replace('\\n','\n').split())
class CopyParser(HTMLParser):
    def __init__(self):super().__init__();self.keys=set()
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if 'data-en' in data:self.keys.add(norm(data['data-en']))
expected=set()
for path in ROOT.glob('*.html'):
    parser=CopyParser();parser.feed(path.read_text());expected.update(parser.keys)
errors=[]
for lang in LANGS:
    data=json.loads((ROOT/f'locale-{lang}.json').read_text())
    assert all(isinstance(k,str) and isinstance(v,str) and v.strip() for k,v in data.items()),lang
    keys={norm(k) for k in data}
    missing={k for k in expected-keys if not k.startswith('38B Jalan')}
    if missing:errors.append((lang,sorted(missing)))
if errors:raise SystemExit(json.dumps(errors,ensure_ascii=False,indent=2))
source=(ROOT/'languages.js').read_text()
assert 'translate.google' not in source and 'translation-dialog' not in source
print(f'PASS: {len(expected)} fixed website phrases covered in all {len(LANGS)} additional local dictionaries; no Google translation dependency.')
