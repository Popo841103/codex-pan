#!/usr/bin/env bash
# Fixed website receiver. This key cannot run a shell or change PMS services.
set -euo pipefail
umask 077
if [[ ${SSH_ORIGINAL_COMMAND:-} == status ]]; then
  curl --fail --silent --show-error --max-time 15 --resolve cohub.jovianhome.com:443:127.0.0.1 https://cohub.jovianhome.com/ -o /dev/null
  exit 0
fi
if [[ ! ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  echo 'Only status or deploy <commit> accepted.' >&2; exit 1
fi
COMMIT=${BASH_REMATCH[1]}
exec 9>/var/lock/cohub-ci.lock
flock -n 9 || { echo 'Website deployment already running.' >&2; exit 1; }
ARCHIVE=$(mktemp /var/tmp/cohub-release-XXXXXXXX.zip)
trap 'rm -f -- "$ARCHIVE"' EXIT
# Bound input before parsing the archive. No executable code is accepted from it.
python3 -c 'import sys; data=sys.stdin.buffer.read(104857601); assert len(data)<=104857600,"Release too large"; open(sys.argv[1],"wb").write(data)' "$ARCHIVE"
python3 /usr/local/lib/cohub-ci/cohub-release.py "$ARCHIVE"
printf 'Deployed CO-HUB commit %s\n' "$COMMIT"
