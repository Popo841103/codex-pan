#!/usr/bin/env bash
# One-time operator bootstrap; preserves existing PMS and other SSH access.
set -euo pipefail
umask 077
[[ $(id -u) == 0 ]] || { echo 'Run as root.' >&2; exit 1; }
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ -f /var/www/cohub/index.html ]] || { echo 'Expected website directory absent.' >&2; exit 1; }
for command in python3 ssh-keygen curl flock; do command -v "$command" >/dev/null; done
install -d -m 755 /usr/local/lib/cohub-ci
install -m 644 "$HERE/baseline.json" /usr/local/lib/cohub-ci/baseline.json
install -m 644 "$HERE/../cohub-release.py" /usr/local/lib/cohub-ci/cohub-release.py
install -m 755 "$HERE/receive-release.sh" /usr/local/lib/cohub-ci/receive-release.sh
install -d -m 700 /root/.ssh /root/.cohub-ci
KEY=/root/.cohub-ci/id_ed25519
if [[ ! -f "$KEY" ]]; then ssh-keygen -q -t ed25519 -N '' -C cohub-website-ci -f "$KEY"; fi
chmod 600 "$KEY"
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
LINE="restrict,command=\"/usr/local/lib/cohub-ci/receive-release.sh\" $(cat "$KEY.pub")"
if ! grep -qxF "$LINE" /root/.ssh/authorized_keys; then printf '%s\n' "$LINE" >> /root/.ssh/authorized_keys; fi
printf 'Website deployment receiver ready. No services restarted.\n'
printf 'Copy contents of %s into GitHub secret COHUB_SSH_KEY locally; never send in chat.\n' "$KEY"
printf 'COHUB_KNOWN_HOSTS value:\n'
awk '{print "207.148.78.107 " $1 " " $2}' /etc/ssh/ssh_host_ed25519_key.pub
