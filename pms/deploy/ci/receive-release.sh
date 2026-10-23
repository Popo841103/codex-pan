#!/usr/bin/env bash
# Forced SSH command: no shell, forwarding or arbitrary root command execution.
set -euo pipefail
umask 077
BASE=/opt/jovian-pms-test
case "${SSH_ORIGINAL_COMMAND:-}" in
  status)
    curl --max-time 8 -fsS http://127.0.0.1:18010/healthz
    exit 0
    ;;
esac
if [[ ! ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  echo 'This key only accepts status or deploy <commit-sha>.' >&2
  exit 1
fi
COMMIT=${BASH_REMATCH[1]}
exec 9>/run/lock/jovian-pms-deploy.lock
flock -n 9 || { echo 'Another PMS deployment is running.' >&2; exit 1; }
install -d -m 700 "$BASE/incoming"
SOURCE=$(mktemp -d "$BASE/incoming/release-XXXXXXXX")
trap 'rm -rf -- "$SOURCE"' EXIT
python3 /usr/local/lib/jovian-pms-ci/extract-release.py "$SOURCE"
# Run the root-owned updater installed by the server operator, never one from the archive.
/usr/local/lib/jovian-pms-ci/update-installed.sh "$SOURCE" "$COMMIT"
