# JOVIAN WorkBuddy continuation — 2026-10-31

Repository: Popo841103/codex-pan. Working/release branch: jovian-pms-test. This branch auto-deploys pms/** changes after Ubuntu tests. Do not push unverified work directly to it.

Last verified deployed commit: 896f38e58e04fb3472a2236b215521556f2c06a9 (145 Node tests passed). Current rate-module candidate parent: b58c2e674d7a44aea139eacb95fb07a2105f579f. Its deployment must be verified in Actions; this document is not deployment proof.

Preserve accounts, database, orders, payments, deposits, stock and writer-generation protection. Do not reseed. SmartOrder is reference-only: no writes, messages, prices, orders, locks, night audit or guest-data export. Do not request credentials. No restaurant charge-to-room. Unified multistore CO-HUB/JOVIAN; actual 10-room/30-bed topology unconfirmed. OTA via paid NOBEDS; TTHotel hardware/integration unverified.

Implemented/deployed before this candidate: shared SQLite development PMS, multi-stay reservations, inventory/box/cleaning workflows, manual payments and separate deposits, 27 selectable order columns, country/language directories, basic traceable finance, support/help, guarded unconnected messaging/self-checkin.

Candidate: independent rate-plan creation, date/weekday calculation, bulk fixed prices/sale flags, rate changes with before/after audit; admin-only shared commands, scoped reads, revision/idempotency; server quoteRateStay supports stopped/missing rates, CTA/CTD and stay-length checks when ratePlanCode is provided. New reservations snapshot server rates. Rates/date focused suite 6 passed. HTTP static asset syntax fixed.

INCOMPLETE: composer does not yet expose/serialize ratePlanCode; manual reservations therefore do not use plan restrictions. Rate UI under Channels is a first version: one room type/date range, all weekdays; no restriction controls, calendar, history table, derived plans, percentage adjustments or multiple ranges. Do not call this complete SmartOrder parity. UI/DOM/end-to-end and full CI need verification. Existing orders must retain prices; edit/extension plan rules need explicit tests.

NEXT: finish composer plan selection with server quote preview; batch weekday/multi-range and min/max/CTA/CTD controls; change-history UI; meaningful API/DOM/Edge tests incl cross-property and stale writes; then deploy via existing workflow, verify actual deploy step, health and backup. No new fake OTA or lock codes.

Local source: C:/Users/xl.pan/Documents/Codex/2026-10-15/chatgpt-chrome-web-store-plugin-browser/work/jovian-pms-v0.4/pms. Reports: same project root outputs/. Local launcher: work/START-JOVIAN-UI-TEST.bat; verification/local-ui-server.mjs; 127.0.0.1:18014/web/; synthetic in-memory data only. Read launcher/source for test-only login, not production credentials. Node>=24. npm test (node --test); Python unittest discover -s test -p test_*.py. Windows private POSIX-mode checks may fail; do not weaken checks. Ubuntu CI is required.

Full research files remain in local outputs/SmartOrder-*.md; they are not all included in this handoff. Verify availability before claiming full research imported. No secrets or real guest/database contents belong in GitHub.
