#!/usr/bin/env bash
# First installation only: isolated test service, no changes to existing sites.
set -Eeuo pipefail
umask 077
DOMAIN=pms.jovianhome.com
BASE=/opt/jovian-pms-test
DBDIR=/var/lib/jovian-pms-test
ACME=/var/lib/jovian-pms-acme
SERVICE=jovian-pms-test
SOURCE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
[[ $(id -u) == 0 ]] || { echo 'Run as root in the SSH session.'; exit 1; }
for tool in curl sha256sum tar nginx certbot systemctl runuser useradd ss; do
    command -v "$tool" >/dev/null || { echo "Missing prerequisite: $tool"; exit 1; }
done
[[ -f "$SOURCE/pms/server/main.js" ]] || { echo 'Incomplete source tree.'; exit 1; }
for path in "$BASE/current" /etc/jovian-pms-test.env /etc/nginx/sites-enabled/jovian-pms-test /etc/nginx/sites-available/jovian-pms-test; do
    [[ ! -e "$path" && ! -L "$path" ]] || { echo "Existing installation: $path. Stop for review; nothing overwritten."; exit 1; }
done
[[ -z $(ss -H -ltn '( sport = :18010 )') ]] || { echo 'Port 18010 is occupied. Stop.'; exit 1; }
TMP=$(mktemp -d)
NGINX_ADDED=0
SUCCESS=0
cleanup() {
    result=$?
    if [[ $SUCCESS == 0 && $NGINX_ADDED == 1 ]]; then
        rm -f /etc/nginx/sites-enabled/jovian-pms-test /etc/nginx/sites-available/jovian-pms-test
        if nginx -t; then systemctl reload nginx; fi
        echo 'Only the new PMS nginx entry was removed. Existing sites and PMS database were preserved.'
    fi
    rm -rf -- "$TMP"
    exit "$result"
}
trap cleanup EXIT
nginx -T >"$TMP/nginx-before.txt" 2>"$TMP/nginx-check.txt" || { cat "$TMP/nginx-check.txt"; exit 1; }
if grep -E '^[[:space:]]*server_name[^;]*pms\.jovianhome\.com([[:space:];]|$)' "$TMP/nginx-before.txt" >/dev/null; then
    echo 'An nginx server_name for pms.jovianhome.com already exists. Stop; do not overwrite it.'; exit 1
fi
grep -E 'include[[:space:]]+/etc/nginx/sites-enabled/' "$TMP/nginx-before.txt" >/dev/null || { echo 'Expected nginx sites-enabled include not found. Stop for review.'; exit 1; }
case $(uname -m) in
    x86_64) ARCH=x64 ;;
    aarch64|arm64) ARCH=arm64 ;;
    *) echo 'Unsupported architecture.'; exit 1 ;;
esac
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$TMP/SHASUMS256.txt"
PACKAGE=$(awk -v suffix="-linux-$ARCH.tar.gz" '$2 ~ /^node-v24\.[0-9]+\.[0-9]+-linux-/ && substr($2,length($2)-length(suffix)+1)==suffix {print $2}' "$TMP/SHASUMS256.txt")
[[ $PACKAGE =~ ^node-v24\.[0-9]+\.[0-9]+-linux-(x64|arm64)\.tar\.gz$ ]] || { echo 'Cannot uniquely resolve Node24 archive.'; exit 1; }
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/latest-v24.x/$PACKAGE" -o "$TMP/$PACKAGE"
(cd "$TMP" && grep -F "  $PACKAGE" SHASUMS256.txt | sha256sum --check --status)
install -d -m 755 "$BASE/runtime" "$BASE/releases"
NODEDIR=${PACKAGE%.tar.gz}
[[ ! -e "$BASE/runtime/$NODEDIR" ]] || { echo 'Runtime directory already exists; stop for review.'; exit 1; }
tar -xzf "$TMP/$PACKAGE" -C "$BASE/runtime" --no-same-owner
chmod -R a+rX "$BASE/runtime/$NODEDIR"
NODE="$BASE/runtime/$NODEDIR/bin/node"
"$NODE" -e "if(Number(process.versions.node.split('.')[0])!==24)process.exit(1)"
# Never replace /usr/bin/node, npm, or existing Node services.
RELEASE="$BASE/releases/$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 755 "$RELEASE/pms"
for dir in src server web deploy; do cp -R "$SOURCE/pms/$dir" "$RELEASE/pms/"; done
cp "$SOURCE/pms/package.json" "$RELEASE/pms/"
find "$RELEASE" -type d -exec chmod 755 {} +
find "$RELEASE" -type f -exec chmod 644 {} +
id jovian-pms >/dev/null 2>&1 || useradd --system --home-dir "$DBDIR" --shell /usr/sbin/nologin jovian-pms
install -d -o jovian-pms -g jovian-pms -m 700 "$DBDIR"
install -d -m 755 "$ACME"
ln -s "$RELEASE" "$BASE/current"
printf 'PMS_PUBLIC_ORIGIN=https://%s\nPMS_PORT=18010\nPMS_DB=%s/jovian.sqlite\nNODE_ENV=test\n' "$DOMAIN" "$DBDIR" >/etc/jovian-pms-test.env
chmod 600 /etc/jovian-pms-test.env
sed "s|ExecStart=/usr/bin/node |ExecStart=$NODE |" "$SOURCE/pms/deploy/jovian-pms-test.service" >/etc/systemd/system/jovian-pms-test.service
chmod 644 /etc/systemd/system/jovian-pms-test.service
# This is an interactive account prompt. Passwords are hidden and not logged.
cd "$RELEASE/pms"
echo 'Create the first TEST account. Role: admin. Stores: TEST-KL,TEST-PG.'
runuser -u jovian-pms -- env PMS_DB="$DBDIR/jovian.sqlite" "$NODE" server/setup.js
systemctl daemon-reload
systemctl enable --now "$SERVICE"
healthy=0
for ((n=0;n<20;n++)); do
    if curl --fail --silent --max-time 2 http://127.0.0.1:18010/healthz >/dev/null; then healthy=1; break; fi
    sleep 1
done
[[ $healthy == 1 ]] || { echo 'PMS health check failed. Existing websites were not changed.'; exit 1; }
cp "$SOURCE/pms/deploy/nginx-pms-http.conf" /etc/nginx/sites-available/jovian-pms-test
chmod 644 /etc/nginx/sites-available/jovian-pms-test
ln -s /etc/nginx/sites-available/jovian-pms-test /etc/nginx/sites-enabled/jovian-pms-test
NGINX_ADDED=1
nginx -t
systemctl reload nginx
# Uses the existing ACME account; no new terms/email consent is supplied.
certbot certonly --webroot --webroot-path "$ACME" --domain "$DOMAIN" --non-interactive
cp "$SOURCE/pms/deploy/nginx-pms-https.conf" /etc/nginx/sites-available/jovian-pms-test
chmod 644 /etc/nginx/sites-available/jovian-pms-test
nginx -t
systemctl reload nginx
# nginx reload completes before all new workers are necessarily serving TLS.
# Retry with certificate verification enabled; use local SNI to verify this host.
curl --retry 12 --retry-all-errors --retry-delay 2 --fail --silent --show-error --max-time 5 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/healthz"
curl --retry 6 --retry-all-errors --retry-delay 2 --fail --silent --show-error --max-time 5 "https://$DOMAIN/healthz"
echo
curl --fail --silent --show-error --max-time 15 "https://$DOMAIN/api/mode"
echo
SUCCESS=1
echo "JOVIAN TEST service responds: https://$DOMAIN/web/"
echo 'Use TEST data only. Login/UI and existing website verification are still required.'
echo "To add an operator account: cd $BASE/current/pms"
echo "runuser -u jovian-pms -- env PMS_DB=$DBDIR/jovian.sqlite $NODE server/setup.js"
