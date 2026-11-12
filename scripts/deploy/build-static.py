"""Build a reproducible static archive; no workstation paths or credentials."""
from pathlib import Path
import hashlib,json,sys,zipfile
root=Path(__file__).resolve().parents[2]
out=Path(sys.argv[1] if len(sys.argv)>1 else 'cohub-release.zip')
named=[root/'community-activities.json',root/'robots.txt',root/'sitemap.xml']
files=sorted([p for p in root.iterdir() if p.is_file() and p.suffix in {'.html','.js','.css'}]+[p for p in named if p.is_file()]+list(root.glob('locale-*.json'))+[p for p in (root/'assets').rglob('*') if p.is_file()])
baseline=json.loads((root/'scripts/deploy/ci/baseline.json').read_text())
# Initial baseline travels with the archive for compatibility.
# The installed CI receiver uses its own trusted baseline and last-successful state.
manifest={'version':__import__('os').environ.get('GITHUB_SHA','local'),'files':{p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in files},'baseline':baseline}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,p.relative_to(root))
 z.writestr('_deploy/manifest.json',json.dumps(manifest))
print(f'Built {len(files)} public files: {out}')
