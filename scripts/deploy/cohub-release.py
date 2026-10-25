"""Install only the verified CO-HUB static release, backing up and rolling back on failure.
No web-server configuration changes or service restarts. Run on the server with Python 3.
"""
from pathlib import Path, PurePosixPath
import datetime, hashlib, json, os, shutil, subprocess, sys, tarfile, tempfile, zipfile

class DeploymentError(RuntimeError):
    pass

def digest(data):
    return hashlib.sha256(data).hexdigest()

def safe_name(name):
    p=PurePosixPath(name)
    if not isinstance(name,str) or p.is_absolute() or '\\' in name or '..' in p.parts or not p.parts or p.parts[0]=='_deploy':
        raise DeploymentError('Unsafe release path')
    if len(p.parts)>1 and p.parts[0]!='assets':
        raise DeploymentError('Unexpected release directory: '+name)
    return p

def atomic_copy(source,target):
    target.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=target.parent,prefix='.cohub-release-',delete=False) as f:
        temp=Path(f.name)
        with source.open('rb') as src:shutil.copyfileobj(src,f)
        os.fchmod(f.fileno(),0o644)
    try:os.replace(temp,target)
    finally:
        if temp.exists():temp.unlink()

def apply_release(root,archive,backup_base,probe,log=print,baseline_override=None):
    root=Path(root).resolve();archive=Path(archive);backup_base=Path(backup_base)
    if not root.is_dir() or not (root/'index.html').is_file():raise DeploymentError('CO-HUB site root not found; nothing changed.')
    old_index=(root/'index.html').read_bytes()
    if b'CO-HUB' not in old_index and b'COHUB' not in old_index:raise DeploymentError('Target is not a recognised CO-HUB website.')
    if digest(probe('index.html'))!=digest(old_index):raise DeploymentError('The live domain is not serving this site directory; nothing changed.')
    stage=Path(tempfile.mkdtemp(prefix='.cohub-stage-',dir=root.parent))
    backup=None;touched=[];existed={}
    try:
        with zipfile.ZipFile(archive) as z:
            if z.testzip() is not None:raise DeploymentError('Release ZIP integrity check failed.')
            manifest=json.loads(z.read('_deploy/manifest.json'))
            files=manifest['files'];baseline=manifest['baseline'] if baseline_override is None else baseline_override
            if not files or len(files)>1000:raise DeploymentError('Invalid release manifest.')
            if sum(z.getinfo(name).file_size for name in files)>100*1024*1024:raise DeploymentError('Release unexpectedly large.')
            for name,expected in files.items():
                p=safe_name(name);target=root.joinpath(*p.parts)
                if target.is_symlink() or any(parent.is_symlink() for parent in target.parents if parent!=root and root in parent.parents):raise DeploymentError('Refusing a symlink target: '+name)
                if not target.resolve().is_relative_to(root):raise DeploymentError('Release path escapes site root.')
                data=z.read(name)
                if digest(data)!=expected:raise DeploymentError('Release checksum mismatch: '+name)
                if target.exists():
                    if not target.is_file():raise DeploymentError('Target is not a regular file: '+name)
                    current=digest(target.read_bytes())
                    accepted={expected}
                    if name in baseline:accepted.add(baseline[name])
                    # Assets are immutable in this release: allow only the expected exact bytes.
                    if current not in accepted:raise DeploymentError('Existing file has other changes; nothing overwritten: '+name)
                path=stage.joinpath(*p.parts);path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
        stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        backup_base.mkdir(parents=True,exist_ok=True)
        backup=Path(tempfile.mkdtemp(prefix='cohub-'+stamp+'-',dir=backup_base));os.chmod(backup,0o700)
        with tarfile.open(backup/'site-before.tar.gz','w:gz') as tar:tar.add(root,arcname='site',recursive=True)
        previous=backup/'previous-files';previous.mkdir()
        for name in files:
            p=safe_name(name);target=root.joinpath(*p.parts);existed[name]=target.exists()
            if target.exists():
                dest=previous.joinpath(*p.parts);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,dest)
        (backup/'manifest.json').write_text(json.dumps({'release':manifest.get('version'),'files':files,'existed':existed},indent=2))
        log('BACKUP: '+str(backup/'site-before.tar.gz'))
        for name in files:
            p=safe_name(name);target=root.joinpath(*p.parts)
            touched.append(name);atomic_copy(stage.joinpath(*p.parts),target)
        for name in ['index.html','community.html','guide.html','enquiry.html','enquiry.js']:
            if name in files and digest(probe(name))!=files[name]:raise DeploymentError('Live verification failed: '+name)
        log('SUCCESS: CO-HUB community, guide and enquiry release verified. No services restarted.')
        return backup
    except Exception:
        if touched and backup is not None:
            for name in reversed(touched):
                p=safe_name(name);target=root.joinpath(*p.parts)
                if existed.get(name):atomic_copy(backup/'previous-files'/Path(*p.parts),target)
                elif target.is_file():target.unlink()
            log('ROLLED BACK: prior website files restored. Backup: '+str(backup))
        raise
    finally:shutil.rmtree(stage)

def local_https_probe(name):
    from urllib.parse import quote
    command=['curl','--fail','--silent','--show-error','--compressed','--max-time','20','--resolve','cohub.jovianhome.com:443:127.0.0.1','https://cohub.jovianhome.com/'+quote(name,safe='/')]
    result=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
    if result.returncode:raise DeploymentError('Local HTTPS check failed; no TLS bypass used. '+result.stderr.decode('utf-8','replace')[:300])
    return result.stdout

if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('Usage: python3 cohub-release.py release.zip')
    try:
        import fcntl
        with open('/var/lock/cohub-static-release.lock','a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX)
            state=Path('/var/lib/cohub-ci/last-files.json')
            trusted=Path('/usr/local/lib/cohub-ci/baseline.json')
            baseline=json.loads(state.read_text()) if state.exists() else (json.loads(trusted.read_text()) if trusted.exists() else None)
            apply_release('/var/www/cohub',sys.argv[1],'/var/backups/cohub',local_https_probe,baseline_override=baseline)
            if trusted.exists():
                with zipfile.ZipFile(sys.argv[1]) as z:files=json.loads(z.read('_deploy/manifest.json'))['files']
                state.parent.mkdir(parents=True,exist_ok=True)
                with tempfile.NamedTemporaryFile(mode='w',dir=state.parent,delete=False) as f:
                    os.fchmod(f.fileno(),0o600);json.dump(files,f);temporary=f.name
                os.replace(temporary,state)
    except Exception as e:
        print('UPDATE STOPPED: '+str(e),file=sys.stderr);raise SystemExit(1)
