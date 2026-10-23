#!/usr/bin/env bash
# Repair only the missing PMS nginx entry following first-install rollback.
set -Eeuo pipefail
SOURCE=/opt/jovian-pms-test/current/pms/deploy/nginx-pms-https.conf
CONF=/etc/nginx/sites-available/jovian-pms-test
LINK=/etc/nginx/sites-enabled/jovian-pms-test
DOMAIN=pms.jovianhome.com
[[ $(id -u) == 0 ]] || { echo 'Run in the server root SSH session.'; exit 1; }
[[ -f "$SOURCE" ]] || { echo 'Installed PMS configuration missing; stop.'; exit 1; }
[[ -f /etc/letsencrypt/live/pms.jovianhome.com/fullchain.pem ]] || { echo 'PMS certificate missing; stop.'; exit 1; }
[[ ! -e "$CONF" && ! -L "$CONF" && ! -e "$LINK" && ! -L "$LINK" ]] || { echo 'PMS nginx entry already exists; stop for inspection.'; exit 1; }
# The backend must already be running. Do not initialize accounts or data again.
curl --fail --silent --show-error --max-time 5 http://127.0.0.1:18010/healthz
install -m 644 "$SOURCE" "$CONF"
ln -s "$CONF" "$LINK"
if ! nginx -t; then
    rm -f "$LINK" "$CONF"
    echo 'New PMS entry removed after syntax failure. Existing config was untouched.'
    exit 1
fi
systemctl reload nginx
# Do not remove a syntactically valid entry for a transient TLS result: retain
# it for diagnosis if these retries fail. Never disable certificate validation.
curl --retry 12 --retry-all-errors --retry-delay 2 --fail --silent --show-error --max-time 5 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/healthz"
curl --retry 6 --retry-all-errors --retry-delay 2 --fail --silent --show-error --max-time 5 "https://$DOMAIN/healthz"
printf '\nPMS HTTPS health checks passed: https://%s/web/\n' "$DOMAIN"
