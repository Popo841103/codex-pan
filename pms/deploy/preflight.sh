#!/usr/bin/env bash
# Read-only target inspection. Does not install, restart or change configuration.
set -eu
printf 'Node executable: '
if command -v node >/dev/null 2>&1; then command -v node; node --version; else printf 'missing\n'; fi
printf 'Caddy executable: '
if command -v caddy >/dev/null 2>&1; then command -v caddy; caddy version; else printf 'missing\n'; fi
printf 'Caddy service: '
if command -v systemctl >/dev/null 2>&1; then systemctl is-active caddy || true; else printf 'systemd unavailable\n'; fi
printf 'PMS test service: '
if command -v systemctl >/dev/null 2>&1; then systemctl is-active jovian-pms-test || true; else printf 'systemd unavailable\n'; fi
printf 'Test port 18010 listeners (empty means unused):\n'
if command -v ss >/dev/null 2>&1; then ss -H -ltn '( sport = :18010 )'; else printf 'ss unavailable: inspect port manually\n'; fi
printf 'Disk space for /opt and /var/lib:\n'
df -h /opt /var/lib
for path in /opt/jovian-pms-test /var/lib/jovian-pms-test /etc/jovian-pms-test.env; do
    if test -e "$path"; then printf 'EXISTS: %s (inspect before modifying)\n' "$path"; else printf 'NEW: %s\n' "$path"; fi
done
