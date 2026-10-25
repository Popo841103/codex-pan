# CO-HUB website

Static CO-HUB website in English, Chinese and Malay, with community activities, arrival guidance and supply enquiries. Accommodation is not open for booking; no online payments.

Read `AGENTS.md`, `docs/project-brief.md` and `docs/deployment-policy.md` before making changes. The fixed publishing method is GitHub Actions, not downloadable update bundles.

## Development

Run `python3 -m http.server 8000 --bind 127.0.0.1`, then `python3 tests/community-browser.py` with Playwright and Chromium installed. Run `python3 tests/deploy-release.py` for backup, conflict and rollback verification.

## Website deployment

Push website changes to branch `cohub-website`. Workflow `.github/workflows/cohub-website.yml` builds a static archive, verifies deployment safety and deploys only to `/var/www/cohub` at `cohub.jovianhome.com`. Other branches and the PMS deployment are independent.

One-time server setup must install `scripts/deploy/ci/setup-server.sh` and its sibling receiver, baseline and parent deployer from a reviewed checkout. It creates a separate forced-command website SSH key. Copy that private key locally into repository secret `COHUB_SSH_KEY`, and the host-key line printed by setup into `COHUB_KNOWN_HOSTS`. Never send private keys in chat. No service restarts or web-server configuration changes are performed.

The workflow fails explicitly when website secrets are missing; a successful build is not a successful deployment. The receiver checks served-root identity and conflicts, backs up before writing, verifies local HTTPS and rolls back on verification failure. After each deployment, server-owned state records the last successful file hashes for subsequent updates.

Current setup is pending verification on the production server. Existing PMS credentials cannot deploy this website.
