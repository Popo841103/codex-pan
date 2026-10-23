#!/usr/bin/env bash
# Run once as root from a reviewed checkout. Re-run only when updating the receiver itself.
set -euo pipefail
umask 077
[[ $(id -u) == 0 ]] || { echo 'Run as root.'; exit 1; }
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ -L /opt/jovian-pms-test/current && -f /etc/jovian-pms-test.env ]] || { echo 'Existing PMS test installation required.'; exit 1; }
for program in python3 ssh-keygen flock curl systemctl; do command -v "$program" >/dev/null; done
install -d -m 755 /usr/local/lib/jovian-pms-ci
install -m 755 "$HERE/receive-release.sh" /usr/local/lib/jovian-pms-ci/receive-release.sh
install -m 644 "$HERE/extract-release.py" /usr/local/lib/jovian-pms-ci/extract-release.py
install -m 755 "$HERE/../update-vultr-test.sh" /usr/local/lib/jovian-pms-ci/update-installed.sh
install -d -m 700 /root/.ssh /root/.jovian-pms-ci
KEY=/root/.jovian-pms-ci/id_ed25519
if [[ ! -e "$KEY" ]]; then ssh-keygen -q -t ed25519 -N '' -C jovian-pms-ci -f "$KEY"; fi
chmod 600 "$KEY"
AUTHORIZED=/root/.ssh/authorized_keys
touch "$AUTHORIZED"
chmod 600 "$AUTHORIZED"
PUBLIC=$(cat "$KEY.pub")
LINE="restrict,command=\"/usr/local/lib/jovian-pms-ci/receive-release.sh\" $PUBLIC"
if ! grep -qxF "$LINE" "$AUTHORIZED"; then printf '%s\n' "$LINE" >>"$AUTHORIZED"; fi
printf '\nPMS deployment receiver configured. Existing SSH access preserved.\n'
printf 'Private key for GitHub PMS_SSH_KEY (copy locally; never send in chat): %s\n' "$KEY"
printf 'Host key for GitHub PMS_KNOWN_HOSTS:\n'
awk '{print "207.148.78.107 " $1 " " $2}' /etc/ssh/ssh_host_ed25519_key.pub
