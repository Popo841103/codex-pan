#!/usr/bin/env bash
# Update only the existing isolated PMS service. Never initialize accounts or replace a database.
set -euo pipefail
umask 077
[[ $(id -u) == 0 ]] || { echo 'Run as root.'; exit 1; }
BASE=/opt/jovian-pms-test
SERVICE=jovian-pms-test
SOURCE=${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}
COMMIT=${2:-manual}
[[ -L "$BASE/current" && -f /etc/jovian-pms-test.env ]] || { echo 'Existing PMS installation required.'; exit 1; }
PREVIOUS=$(readlink -f "$BASE/current")
[[ "$PREVIOUS" == "$BASE/releases/"* && -f "$PREVIOUS/pms/server/main.js" ]] || { echo 'Unexpected current release; stop for review.'; exit 1; }
# Read the existing service's executable without evaluating its unit or environment as shell code.
NODE=$(systemctl show "$SERVICE" --property=ExecStart --value | sed -n 's/.*path=\([^ ;]*\).*/\1/p')
[[ "$NODE" == "$BASE/runtime/"*/bin/node && -x "$NODE" ]] || { echo 'Unexpected runtime; preserve and stop.'; exit 1; }
"$NODE" -e 'if(Number(process.versions.node.split(".")[0])!==24)process.exit(1)'
DBPATH=$(sed -n 's/^PMS_DB=//p' /etc/jovian-pms-test.env)
[[ "$DBPATH" == /var/lib/jovian-pms-test/jovian.sqlite && -f "$DBPATH" ]] || { echo 'Unexpected database path; stop.'; exit 1; }
[[ -n "$COMMIT" && "$COMMIT" =~ ^([0-9a-f]{40}|manual)$ ]] || { echo 'Invalid release commit.'; exit 1; }
VERSION=$("$NODE" -e 'const p=require(process.argv[1]);if(!/^\d+\.\d+\.\d+$/.test(p.version))process.exit(1);process.stdout.write(p.version)' "$SOURCE/pms/package.json")
curl --max-time 8 -fsS http://127.0.0.1:18010/healthz >/dev/null
RELEASE=$(mktemp -d "$BASE/releases/update-XXXXXXXX")
install -d -m 755 "$RELEASE/pms"
for dir in src server web; do cp -R "$SOURCE/pms/$dir" "$RELEASE/pms/"; done
cp "$SOURCE/pms/package.json" "$RELEASE/pms/"
printf '%s\n' "$COMMIT" >"$RELEASE/pms/release-commit"
chmod -R a+rX "$RELEASE"
while IFS= read -r -d '' file; do "$NODE" --check "$file"; done < <(find "$RELEASE/pms/src" "$RELEASE/pms/server" "$RELEASE/pms/web" -name '*.js' -print0)
install -d -m 700 /var/backups/jovian-pms-test
BACKUP=$(mktemp -d /var/backups/jovian-pms-test/update-XXXXXXXX)
# Online SQLite backup captures a consistent WAL snapshot, including account and order data.
"$NODE" --input-type=module - "$DBPATH" "$BACKUP/jovian.sqlite" <<'JS'
import {DatabaseSync,backup} from 'node:sqlite';
const db=new DatabaseSync(process.argv[2]);
await backup(db,process.argv[3]);db.close();
JS
chmod 600 "$BACKUP/jovian.sqlite"
printf '%s\n' "$PREVIOUS" >"$BACKUP/previous-release"
printf '%s\n' "$COMMIT" >"$BACKUP/new-commit"
SWITCHED=0
rollback(){
  status=$?
  if (( status != 0 && SWITCHED == 1 )); then
    ln -s "$PREVIOUS" "$BASE/current-rollback-$$"
    mv -Tf "$BASE/current-rollback-$$" "$BASE/current"
    systemctl restart "$SERVICE" || true
    echo 'Code reverted to previous release; database preserved.' >&2
  fi
  exit "$status"
}
trap rollback EXIT
ln -s "$RELEASE" "$BASE/current-next-$$"
mv -Tf "$BASE/current-next-$$" "$BASE/current"
SWITCHED=1
systemctl restart "$SERVICE"
curl --retry 12 --retry-all-errors --retry-delay 1 --max-time 5 -fsS http://127.0.0.1:18010/healthz
MODE=$(curl --retry 4 --retry-all-errors --retry-delay 1 --max-time 8 -fsS https://pms.jovianhome.com/api/mode)
printf '%s' "$MODE" | "$NODE" --input-type=module -e 'let raw="";for await(const chunk of process.stdin)raw+=chunk;if(JSON.parse(raw).version!==process.argv[1])process.exit(1)' "$VERSION"
curl --retry 4 --retry-all-errors --retry-delay 1 --max-time 8 -fsS https://pms.jovianhome.com/web/manifest.webmanifest >/dev/null
trap - EXIT
ln -s "$PREVIOUS" "$BASE/previous-next-$$"
mv -Tf "$BASE/previous-next-$$" "$BASE/previous"
printf '\nPMS code updated. Backup: %s\n' "$BACKUP"
