# PMS test deployment

The server receiver has been initialized and the operator reports PMS_SSH_KEY and PMS_KNOWN_HOSTS saved in GitHub Actions secrets. This update requests the first real deployment of the tested 0.5 release.

Only the existing jovian-pms-test service may be updated. Keep accounts, database, nginx and other sites intact. The workflow must verify tests, remote SSH identity, backup and post-update health. A successful test-only run is not a deployment.
