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


## Trustworthy business day, night audit and shift handover update (2026-10-31)

The business date was previously only a free-form browser field (`$('#date').value`), never persisted and never auditable, so nothing could be trusted as a closed day. It is now authoritative per-property state.

New module `pms/src/business-day.js` and a Statistics > Night audit page. Rules implemented independently from the SmartOrder reference observations:

- **Business date** is persisted per property and starts unset. An administrator sets it once; afterwards only a night audit advances it, exactly one day at a time. It is never inferred from a server clock without an administrator confirming it.
- **Night audit** classifies exceptions: required (arrival never checked in, departure never checked out) and advisory (order box expiring, history unsettled). A required exception blocks closing. A forced close is allowed only with a recorded reason and is stored as `forced`, never silently accepted. Every audit appends an immutable record with date, actor, mode, exception counts and reason.
- **Audit locking**: once a night is closed, editing or cancelling a stay that touches it is rejected with `audited`. The override is granted only server-side to the `admin` role; a browser-supplied `auditOverride` from any other role is refused with 403. Taking money is *not* blocked, because a receipt does not rewrite what the closed night earned. An unset business date locks nothing, so existing data was never affected. (Corrected 2026-10-31: `payment` was originally included in this lock, which would have refused a guest paying today for a night already closed.)
- **Shifts**: names are unique up to 20 characters and ranges cannot overlap; a shift may cross midnight. A shift with handover records cannot be deleted.
- **Handover** stores a snapshot of the window with payments, refunds and deposits separated. Windows use the property's fixed UTC+8 offset; Malaysia has no daylight saving.

Permissions: `business_date_init`, `shift_save`, `shift_delete` are administrator-only; `night_audit` and `shift_handover` are available to operations. The home page night-audit status now shows the real business date and last auditor instead of a permanent "not enabled" label, and links to the page.

Also fixed: `commit()` previously overwrote an explicit command `date` with the work-date default, so any command carrying its own date silently lost it. The command value now wins.

Verification: Node 197/197 pass (was 179; 13 new business-day reducer tests, 5 new shared-service authorization tests), Python 5/5 pass, and a new `verification/dom-night-audit.mjs` passes — it drives the real UI modules to set the opening date, close a day, be blocked by an unresolved arrival, force it with a reason, then save a shift and record a handover. `dom-settlement.mjs` and `dom-financial.mjs` still pass. Windows full-suite results must still be checked separately; the two known POSIX private-file mode failures are unchanged and were not weakened.

**Deployment constraint discovered and worked around (important for all further work):** the release install on the test server refreshes files that already exist but does **not** add brand-new files. Commit `a748c6c` added `pms/web/night-audit-ui.js` and `pms/src/business-day.js`; both were served as 404 while every modified file deployed correctly. Because `app.js` imported the missing modules, the front end could not load at all. The fix was to fold both into files the install already refreshes — night audit rendering into `pms/web/workspace-ui.js`, business-day rules into `pms/src/demo-store.js` (re-exported for UI and tests). Until the server-side installer is changed, **do not introduce new files under `pms/src`, `pms/server` or `pms/web`**; extend existing ones. New files are still fine for `pms/test/` and `pms/verification/`, which are not deployed. After any deploy, verify the served files, not just the push: check `/healthz` and confirm the modules `app.js` imports all return 200.

Still not done: this is the business-day foundation only. It is not a full accounting close, not the manager daily report, not cash-up variance approval, and not automatic night audit. Reports, shifts and night audit are not yet cross-checked against each other. Real NOBEDS OTA, payment and TTHotel lock integrations remain unconnected.

## Manager's daily report and guest ledger update (2026-10-31)

Two new pages under Statistics, built on the trustworthy business date: **Manager's daily report** and **Guest ledger balances**. The calculations live in `pms/src/financial-reports.js` (`managerDailyReport`, `guestLedger`, `dailyOperations`, `orderBalanceAt`, `orderChargeLines`) and render from `pms/web/financial-ui.js`.

- **Daily report** states the opening balance, charges earned today, net receipts today and the closing balance, and prints the formula using the day's own numbers: `closing = opening + charges − net receipts`. If the movements cannot rebuild the closing balance, the page says the day is unreconciled rather than presenting a total that does not tie back to the guest ledger.
- **Two clocks, never mixed**: charges are cut on the business date because that is when they are earned; receipts are cut on the Malaysian transaction day because that is when money moved. Both are named on the page. Deposits are a liability, never revenue, and are listed separately.
- **Cancellation penalties now post to a business date.** `cancel` records `cancelBusinessDate` when a business date exists. Cancellations made before any business date existed keep no date and stay reported as unallocated instead of being backdated by guesswork.
- **Guest ledger** splits outstanding, overpaid-to-return and deposit-held into separate buckets that are never netted against each other, and states plainly that JOVIAN offers no charge-to-room. A stay still holding a deposit is not counted as settled.
- Growth versus the same day last month and last year always shows the delta and shows a percentage only when the base is non-zero.

**Correction to the previous batch:** audit locking was too broad. `payment` was rejected with `audited` whenever a stay touched a closed night, which would have refused a guest paying today for a night already closed. Only `edit` and `cancel` can rewrite what a closed night earned, so only those two are blocked; receipts always post. The test that asserted the old behaviour was rewritten to state the corrected rule, not deleted.

Tests: Node 210 (was 197), Python 5/5, plus a new `verification/dom-manager-report.mjs` driving the real UI through a reconciled day, a penalty landing on its own business date and the three ledger buckets. `dom-settlement`, `dom-financial` and `dom-night-audit` still pass. No new runtime files were added, so the release-install constraint above does not apply to this batch.

Still not done: this is not a full accounting close; not the eight accommodation reports; not the remaining financial reports (receipt detail, ledger adjustment log, non-stay income and expense); not cash-up variance approval; not automatic night audit; not channel commission settlement or bank reconciliation. Reports, shifts and night audit are still not fully cross-checked against each other.

## Accommodation reports update (2026-10-31)

Three new pages under Statistics: **Room charge detail**, **Room business summary** and **Room movement log**. Calculations live in `pms/src/financial-reports.js` (`nightInventory`, `roomChargeDetail`, `roomBusinessSummary`, `roomMovementLog`); rendering lives in `pms/web/financial-ui.js`.

- **Rooms, suites and beds are counted separately.** A dorm bed and a whole room are not the same product, so ADR, occupancy and RevPAR are reported per product as well as in total.
- **Composition is de-duplicated by atoms.** A suite occupies the atoms of the rooms and beds inside it. Once a suite is sold for a night, those units are removed from sellable supply for that night instead of being counted twice: once as the suite and again as rooms. A maintenance or out-of-service block removes a unit from the denominator; a **hold** prevents selling but stays in the denominator, which is the stated JOVIAN policy.
- **Occupancy is refused where it cannot be honest.** Inventory belongs to the property, not to a booking channel, so the channel dimension has no defensible denominator. ADR is still given; occupancy and RevPAR show as unavailable with an explanation rather than being split by an invented rule.
- **Unassigned stays are named, not hidden.** A stay that takes inventory but has no unit yet is counted in sold nights and revenue, and reported separately as unassigned room-nights.
- **Room charge detail** lists every earned night at its own rate. Cancellation penalties are not room revenue and never appear here.

**Audit gained what the movement log needs.** Every stay movement now records `actor` and a `stayChange` pair holding the state before and after: start, end, nightly rate, unit, status and final charge. Early departure, late departure, date change, price change, room change, cancellation, box and restore are each classified. Without this the movement log could only show what a stay became, never what it was.

**Important:** the shared service writes its durable audit from its own summary, not from the local reducer, so adding `stayChange` to `src/demo-store.js` alone had no effect on a shared backend. `server/store.js` now records the same pair from the state before and after each command. Both paths must be kept in step.

**Known gaps stated on the page rather than faked:** orders carry no rate plan, only a `nightlyRates` price snapshot, so the rate plan column says *not recorded* instead of guessing one; there is no room-group field in the catalogue, so grouping is offered by unit and by room type only.

Tests: Node 224 (was 210), Python 5/5, plus a new `verification/dom-accommodation.mjs` that builds a suite from two rooms, sells it, and checks that the room row drops from ten sellable to eight while the beds are untouched. `dom-settlement`, `dom-financial`, `dom-night-audit` and `dom-manager-report` still pass. No new runtime files were added.

**Deployment verification limit for this batch.** `pms/server/store.js` changed, and the test server correctly does **not** serve anything under `/server/` over HTTP (the path returns a 21-byte refusal, not the file), so its deployment cannot be confirmed from outside the server. Everything served to the browser was verified after the deploy: `src/financial-reports.js` carries `sellableUnits`, `roomBusinessSummary` and `roomMovementLog`; `src/demo-store.js` carries `stayChange`; `web/financial-ui.js` carries the three pages; the navigation entries and route are present; and all 9 `src` plus 12 `web` modules referenced by `app.js` return 200. To confirm the backend half, on the server run `grep -c stayChange /opt/jovian-pms-test/current/server/store.js` and check the service was restarted after the release; until that is done, treat *"the durable audit records before/after state"* as **deployed but unconfirmed** rather than verified.

Still not done: five of the eight accommodation reports (other room charge detail, cancellation penalty detail, commission detail, registration record, room occupant detail); room groups; rate plans linked to orders; cash-up variance approval; automatic night audit; channel commission settlement; bank reconciliation.

## Verified release and next handoff — 2026-10-31
Latest deployed product commit: 4340b877f0361b09514014a5bdae5c7a5959c19e. Actions41196678780, job124524134947: Verify and Deploy both succeeded; Ubuntu179/179 Node tests pass. Backup /var/backups/jovian-pms-test/update-srIp8cK1. No real production business transactions were used for acceptance.

Real Edge18015 receipt/operator verification passed; full DOM workflows passed again after the final operator changes. Keep the distinction: DOM regression covers broader workflows than the actual Edge checks. Existing Windows179 tests177 pass/2 fail are the POSIX-private-file checks named above; security checks were not weakened.

The four existing local SmartOrder Markdown research files are now copied to handoff/research/. They contain page/field/workflow observations and unverified branches; preserve their observation dates and evidence labels. Do not promote old observations into fresh verification. JOVIAN-CURRENT-STATUS.md is the compact source/runtime/release/remaining-work index. Original outputs/ ledgers and screenshots remain on the user's machine; no guest records, database dumps or credential files were included.

Next: continue complete finance/reporting and shift/night-audit design with trustworthy business-day rules, remaining website builder/property content, guest self-checkin and channel messaging branches. True OTA/payment/lock connections still need provider/device verification. Full parity remains incomplete. Keep the active overall objective; do not stop at menu placeholders.

## Other charges and cancellation penalties update (2026-11-01)

Two more of the eight accommodation reports are now pages under Statistics: **Other charge detail** and **Cancellation penalty detail**. Calculations live in `pms/src/financial-reports.js` (`extraChargeDetail`, `cancellationPenaltyDetail`, `policySnapshot`, `bookedTotal`, `nightCount`); rendering lives in `pms/web/financial-ui.js` (`extraChargePage`, `cancellationPenaltyPage`).

- **Extras and discounts are never netted before display.** A discount is listed as its own negative line, the page shows extras total, discounts total and the net separately, and a missing business date sends the line to an unallocated section instead of a convenient day.
- **A superseded stay is not billed twice.** Once a stay is cancelled or carries a final charge, its extra lines are no longer billed separately. Those orders are excluded and counted on the page as *replaced by a final charge*, so the number is visible rather than silently missing.
- **A penalty belongs to the business date the cancellation happened on.** It is not room revenue, and a penalty without a stored cancellation business date is listed as unallocated. The page shows the value booked, the penalty, the share it takes of the booking, what has already been received on that order and who cancelled it.
- **The policy is shown as the snapshot taken when the stay was booked, never recomputed into a fee.** The moment of cancellation was never recorded, so for a flexible policy there is no honest way to decide whether the free window had passed. The deadline is displayed because it is derivable from the booking; a "what the policy would have charged" amount would be a guess, so it is not produced. A stay with no stored policy says so.
- JOVIAN still offers no charge-to-room, so this page can never contain a restaurant bill.

**Two corrections carried in this batch.** The Chinese text on the room business summary page contained three corrupted characters from the previous batch and was rewritten. The five accommodation report pages now keep their filters editable when the range is rejected, instead of returning only an error and leaving the operator stuck on a bad date.

Tests: Node 240 (was 224), Python 5/5, plus a new `verification/dom-extra-penalty.mjs` that books a stay with an extra and a discount, books a second stay on a rate plan carrying a flexible policy, cancels it with a penalty, and checks that the discount renders as a negative line, that the cancelled stay does not appear in the other-charge page, and that the penalty page shows the policy snapshot and the share of the booking. `dom-accommodation`, `dom-manager-report`, `dom-night-audit`, `dom-financial`, `dom-settlement`, `dom-comparison`, `dom-rates`, `communications-dom` and the full `dom-workflows` still pass. No new runtime files were added, so the release-install constraint is unaffected. This batch changes no backend file, so unlike the previous one it can be fully verified from outside the server.

Still not done: three of the eight accommodation reports (commission detail, registration record, room occupant detail); room groups; rate plans linked to orders; cash-up variance approval; automatic night audit; channel commission settlement; bank reconciliation.
