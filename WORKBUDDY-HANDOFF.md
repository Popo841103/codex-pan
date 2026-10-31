# JOVIAN WorkBuddy continuation — 2026-10-31

Repository Popo841103/codex-pan; release branch jovian-pms-test. Pushes touching pms/** automatically run Ubuntu checks then deploy the existing test service. Preserve production accounts, database, guest and financial records. Never reset or replace data. Do not edit the deployment workflow or expose credentials.

Latest verified deployed baseline: 2ffbdab50ddbdd249d6a81830245b5b3b0a13429, Actions 41194249260, Node 173/173 passing, deploy step successful; backup /var/backups/jovian-pms-test/update-yMciBsVf. This commit adds explicit folio settlement, audited administrator reopening, closure protection and grouped settlement status/filters. Money balancing alone does not close a folio; deposits must separately clear. This handoff commit also adds visible settlement/reopening history.

Implemented since the older handoff: composer rate-plan selection with server re-quote and snapshot; multi-date/weekday rate batches; fixed/delta/percent pricing; min/max/CTA/CTD; scoped history; one-level derived plans; safe archive; cancellation policy snapshots and Malaysia deadline previews; standalone rate/availability calendar accounting for shared suite/bed atoms and overdue occupancy; business revenue grouping by date/channel/room type; cash ledger kind/method filters, counts and trusted actors; manual payment/deposit separation. Cancel previews do not automatically charge or refund. Existing orders keep agreed prices.

Verification: focused core/shared role/idempotency tests and in-process DOM rate/financial/settlement tests passed. Windows full suite has two known POSIX private-file mode incompatibilities (NOBEDS config and guest encryption key); do not weaken them. Ubuntu CI is mandatory. The large dom-workflows script has an unresolved intermittent multi-stay submission timeout; dedicated DOM tests do not establish full regression. Real Edge had stale service on port18014 returning404 for new assets; alternate launcher on18015 now verified in real Edge: synthetic reservation, explicit settlement, disabled financial write and reasoned reopening with history passed. Distinguish DOM simulation from real Edge and from production acceptance.

Remaining: full SmartOrder UI/workflow parity, full accounting reports, shifts/night audit, website generation, remaining self-checkin/communication branches, and real paid NOBEDS OTA/chat, payment and TTHotel integrations. External integrations remain unconnected unless verified with provider/hardware. Never invent lock codes or claim live OTA. Edit/extension rate-plan rules need deeper coverage. Real property layout remains unconfirmed. One unified multistore system; restaurant charges do not post to accommodation.

Local source: C:/Users/xl.pan/Documents/Codex/2026-10-15/chatgpt-chrome-web-store-plugin-browser/work/jovian-pms-v0.4/pms. Local outputs/ contains SmartOrder research and JOVIAN deployment/development/acceptance ledgers. Preserve existing code and original v0.3/P1 work. Local launcher work/START-JOVIAN-UI-TEST.bat uses18014; work/START-JOVIAN-UI-TEST-18015.bat uses18015. Both use verification/local-ui-server.mjs, memory-only synthetic data. Read source for synthetic login, never request production credentials.

SmartOrder inspection is strictly read-only: no orders/prices/inventory/payments/messages/locks/night-audit writes, no reading sessions that auto-mark real messages read, no guest/credential capture. Research records distinguish actually observed UI, official documents, inference and unverified branches. No secrets, guest records or database dumps in GitHub. Continue independently; ask only for genuinely required external access/user interaction.


## Period comparison update (2026-10-31)
New Statistics > Operating period comparison page: independently editable current/month/year inclusive date ranges, month-end/leap defaults, channel scoping, room/extra revenue, unit nights, receipts/refunds and separate deposits. Zero comparison base shows no percentage; negative base uses its absolute magnitude. Revenue and cash are never added. Missing posting dates remain unallocated. Each period drills to the existing revenue or receipt ledger preserving dates/source. This is comparison groundwork, NOT complete manager accounting, shifts or night audit.

Core/render tests and DOM period/drill-through passed. Windows full suite176:174 pass plus2 known POSIX private-mode failures. Real Edge18015 verified with synthetic MYR123.45 revenue versus zero receipts and matching detail amounts. No production business records changed. Continue full remaining scope and the intermittent large multi-stay DOM issue. Deployment outcome for this update must be checked via its own Actions run, not inferred from this handoff.


## Cashier filters and full DOM regression update (2026-10-31)
Operating comparison deployed as ec59a6e63ceb68be372e13894d7ce62ca30d949e; Actions41196136190/job124522565439 passed176/176 and actually deployed, backup /var/backups/jovian-pms-test/update-Aa0mA5wb.

Cashier ledger now supports operator filtering, including legacy unknown actors; dropdown choices only use current-property transactions. Reserved selection words are distinguished from actual usernames. Date, kind, method and operator filters reconcile counts/totals. No provider or bank connection implied. Comparative date controls match the workspace styling.

The earlier full dom-workflows multi-stay timeout reproduced as a test harness race: the test proceeded after memo DB persistence but before its shared UI refresh finished, triggering the real busy guard. Test now awaits both persistence and visible completion. Full DOM sequence passed twice, including multi-stay reservation, conflict/draft preservation, calendar ranges, blocks, order-box restore, business reports and Malay UI. No production guard was weakened. Dedicated financial DOM operator filtering also passed. Windows179 tests177pass plus the same2 private POSIX-mode incompatibilities; final Linux CI for this update still must be checked.

Real Edge18015 subsequently verified a synthetic MYR10 receipt: selecting local-ui-test shows one MYR10 row, selecting legacy unknown shows zero rows/totals. Only synthetic memory data was changed.


## Verified release and next handoff — 2026-10-31
Latest deployed product commit: 4340b877f0361b09514014a5bdae5c7a5959c19e. Actions41196678780, job124524134947: Verify and Deploy both succeeded; Ubuntu179/179 Node tests pass. Backup /var/backups/jovian-pms-test/update-srIp8cK1. No real production business transactions were used for acceptance.

Real Edge18015 receipt/operator verification passed; full DOM workflows passed again after the final operator changes. Keep the distinction: DOM regression covers broader workflows than the actual Edge checks. Existing Windows179 tests177 pass/2 fail are the POSIX-private-file checks named above; security checks were not weakened.

The four existing local SmartOrder Markdown research files are now copied to handoff/research/. They contain page/field/workflow observations and unverified branches; preserve their observation dates and evidence labels. Do not promote old observations into fresh verification. JOVIAN-CURRENT-STATUS.md is the compact source/runtime/release/remaining-work index. Original outputs/ ledgers and screenshots remain on the user's machine; no guest records, database dumps or credential files were included.

Next: continue complete finance/reporting and shift/night-audit design with trustworthy business-day rules, remaining website builder/property content, guest self-checkin and channel messaging branches. True OTA/payment/lock connections still need provider/device verification. Full parity remains incomplete. Keep the active overall objective; do not stop at menu placeholders.
