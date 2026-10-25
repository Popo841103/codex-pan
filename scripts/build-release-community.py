"""Create a static release and a Windows double-click deployment bundle. No credentials."""
from pathlib import Path
import base64, hashlib, json, zipfile, shutil

R=Path(__file__).resolve().parents[1]
OUT=Path('/workspace/cohub-community-release');OUT.mkdir(exist_ok=True)
VERSION='20261024-community1'
def sha(data):return hashlib.sha256(data).hexdigest()
files=[p for p in R.iterdir() if p.is_file() and p.suffix in ['.html','.js','.css']]
files.append(R/'community-activities.json')
files.extend(p for p in (R/'assets').rglob('*') if p.is_file())
files=sorted(set(files))
baseline={}
with zipfile.ZipFile(OUT/'pre-change-source.zip') as old:
    for name in old.namelist():
        if any(p.relative_to(R).as_posix()==name for p in files):baseline[name]=sha(old.read(name))
manifest={'version':VERSION,'files':{p.relative_to(R).as_posix():sha(p.read_bytes()) for p in files},'baseline':baseline}
release=OUT/'cohub-static-20261024.zip'
with zipfile.ZipFile(release,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.relative_to(R))
    z.writestr('_deploy/manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
    z.write(R/'scripts/deploy/cohub-release.py','_deploy/cohub-release.py')
release_sha=sha(release.read_bytes())
remote='/tmp/cohub-static-20261024-'+release_sha[:10]+'.zip'
bootstrap=f'''import hashlib,sys,zipfile
p={remote!r}
with open(p,'rb') as f:actual=hashlib.file_digest(f,'sha256').hexdigest() if hasattr(hashlib,'file_digest') else hashlib.sha256(f.read()).hexdigest()
if actual!={release_sha!r}:raise SystemExit('Uploaded release checksum mismatch; nothing changed.')
with zipfile.ZipFile(p) as z:code=z.read('_deploy/cohub-release.py')
sys.argv=['cohub-release.py',p]
exec(compile(code,'cohub-release.py','exec'),{{'__name__':'__main__'}})
'''
bootstrap64=base64.b64encode(bootstrap.encode()).decode()
installer=r'''$ErrorActionPreference = 'Stop'
$target = 'root@207.148.78.107'
$releasePath = Join-Path $PSScriptRoot 'cohub-static-20261024.zip'
$remotePath = '__REMOTE__'
$expectedHash = '__HASH__'
try {
    Write-Host 'CO-HUB 官网更新 / Website update' -ForegroundColor Cyan
    Write-Host '只更新 CO-HUB 静态网站；自动备份及验证，不重启其他服务。'
    if (-not (Test-Path -LiteralPath $releasePath)) { throw '找不到完整更新包，请先把下载的ZIP全部解压，再运行本文件。' }
    if (-not (Get-Command scp.exe -ErrorAction SilentlyContinue)) { throw '此电脑找不到Windows OpenSSH的scp.exe。' }
    if (-not (Get-Command ssh.exe -ErrorAction SilentlyContinue)) { throw '此电脑找不到Windows OpenSSH的ssh.exe。' }
    $actualHash = (Get-FileHash -LiteralPath $releasePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $expectedHash) { throw '更新包校验失败，请重新下载，不会修改服务器。' }
    Write-Host '第1步：上传。出现password提示时，在此窗口输入服务器密码；输入不会显示。' -ForegroundColor Yellow
    & scp.exe -o StrictHostKeyChecking=yes -o ConnectTimeout=20 $releasePath "${target}:$remotePath"
    if ($LASTEXITCODE -ne 0) { throw '上传未成功，网站尚未更新。请保留错误信息。' }
    Write-Host '第2步：校验、备份、更新及验证。可能需要再次在此窗口输入密码。' -ForegroundColor Yellow
    $remoteCommand = "python3 -c 'import base64;exec(base64.b64decode(`"__BOOTSTRAP__`"))'"
    & ssh.exe -o StrictHostKeyChecking=yes -o ConnectTimeout=20 $target $remoteCommand
    if ($LASTEXITCODE -ne 0) { throw '服务器更新未完成。若更新后验证失败，脚本会尝试恢复原文件；请把本窗口的错误信息发给助手。' }
    Write-Host '更新完成！请在网站按 Ctrl+F5 刷新。' -ForegroundColor Green
    Start-Process 'https://cohub.jovianhome.com/?v=20261024-community1'
    exit 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host '不要删除原网站或重装服务器。请截图本窗口的报错，注意不要包含密码。'
    exit 1
}
'''.replace('__REMOTE__',remote).replace('__HASH__',release_sha).replace('__BOOTSTRAP__',bootstrap64)
(OUT/'Install-COHUB.ps1').write_text(installer,encoding='utf-8-sig')
launcher='''@echo off\r\nsetlocal\r\necho CO-HUB website update\r\necho.\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-COHUB.ps1"\r\nset "COHUB_EXIT=%ERRORLEVEL%"\r\necho.\r\npause\r\nexit /b %COHUB_EXIT%\r\n'''
(OUT/'Install-COHUB.cmd').write_bytes(launcher.encode('ascii'))
readme='''CO-HUB 官网更新 2026-10-24

1. 在Windows电脑右键下载包，选择“全部解压”。
2. 打开解压后的文件夹，双击 Install-COHUB.cmd。
3. 当窗口出现 password 提示时，直接在电脑终端输入服务器密码（不会显示字符）。可能提示两次。不要把密码写进任何文件或聊天。
4. 看到 SUCCESS / 更新完成后，网站按 Ctrl+F5 刷新。

此包只更新 /var/www/cohub 的静态文件，不修改 Nginx/Caddy 配置，不重启其他服务。
会先验证域名对应的网站目录、检查文件冲突并在 /var/backups/cohub 备份。
如果现有网站文件与打包时不同，会停止，避免覆盖其他人的修改；请截图错误信息。
若部署后的本机HTTPS内容验证失败，会恢复本次覆盖的文件并报告备份位置。
SSH使用已有服务器主机密钥校验。若提示主机密钥问题，请先核实，不要关闭校验。

更新内容：社区与活动、到店及入住指南、分类咨询、开业通知请求、Instagram、更多语言自动翻译阅读入口。
没有真实订房、支付、后台自动订阅或活动名额确认。消息需客人在WhatsApp／邮件确认发送，并由团队回复确认。

此包不含服务器密码，不会保存你输入的密码。
'''
(OUT/'README-先读.txt').write_text(readme,encoding='utf-8-sig')
bundle=Path('/workspace/COHUB-Website-Update-20261024.zip')
with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED) as z:
    for name in ['cohub-static-20261024.zip','Install-COHUB.ps1','Install-COHUB.cmd','README-先读.txt']:z.write(OUT/name,name)
with zipfile.ZipFile(bundle) as z:assert z.testzip() is None
(OUT/'release-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'public_files':len(files),'release_sha256':release_sha,'bundle_bytes':bundle.stat().st_size,'bundle':str(bundle)}))
