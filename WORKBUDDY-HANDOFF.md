# JOVIAN WorkBuddy continuation — 2026-11-11

Repository Popo841103/codex-pan; release branch jovian-pms-test. Pushes touching pms/** automatically run Ubuntu checks then deploy the existing test service. Preserve production accounts, database, guest and financial records. Never reset or replace data. Do not edit the deployment workflow or expose credentials.

最新续跑发布（2026-11-11）：`96ff297`功能 / `5b40732`空时间修正，最终Actions `42859317901`成功，Node534/534、Python5/5、DOM30/30；15条提升，矩阵已有63/部分36/缺失0/禁止或外部15。公网健康、四份JS与打印CSS哈希一致，26模块GET200；小时预订整日库存保护仍部分。详见本文末尾中文续跑节。

Historical verified deployed baseline: `40df39059a0e0de2ce056bd7fcb31a04cac49b81` (2026-11-10 internal operations A1–A9), Actions `42836859905` / job `129901265793`, Ubuntu Node449/449 and Python5/5, actual deploy successful. Backup `/var/backups/jovian-pms-test/update-8Fpq4WBO` remains the publisher's existing backup format: offline encryption tools are available but have NOT been wired into the deployment workflow. Local DOM27/27. Public GET health and three changed browser/source files match local SHA256. See the Chinese batch section at the end and `pms/verification/internal-operations-audit.md` for exact scope, A6 operational boundary and the unavailable shared A7 inventory. Existing folio closure, deposits, guest data and night-audit/AR protections remain. Historical release entries below describe their own batches.

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

## Occupants, registration and commission update (2026-11-01)

The last three of the eight accommodation reports are now pages under Statistics: **Room occupant detail**, **Registration record** and **Commission detail**. Calculations live in `pms/src/financial-reports.js` (`roomOccupantDetail`, `registrationRecord`, `commissionDetail`); rendering lives in `pms/web/financial-ui.js` (`roomOccupantPage`, `registrationRecordPage`, `commissionPage`).

- **One row per person, never one row per booking.** Each occupant row carries the booking contact, the occupant name, gender, room type, unit, channel, arrival and departure, nights and the party size they arrived with. A cancelled booking has nobody in the room and is excluded.
- **A name that was never entered is reported as missing.** Blank names are counted and shown as *no name entered*; they are never dropped from the headcount and never filled in from another stay.
- **Placement is selectable and stated.** These pages place a stay on the arrival date the booking carries, not on a business date, because nothing here is earned on a night that a night audit would move. A second basis, *any night in the period*, keeps stays that were already in house when the window opened, and shows the first night inside the window rather than the arrival date.
- **Registration means what the stay record holds.** Identity documents stay encrypted on the server and the review state lives on the self-check-in review page, so this report only checks whether the names carried on the booking are complete. It never decrypts, exports or displays a document number, and the page says so in all three languages.
- **Commission is reported as a gap, not as a number.** An order stores no commission amount, no channel rate is configured anywhere and no settlement ever arrives, so the commission column reads *not recorded* on every row and in every total. What the page does give is what each channel booking was worth - room, extras, penalty, received, outstanding - which is exactly what reconciling a channel invoice by hand needs. A real commission figure requires either stored channel rates or real settlement data; neither exists yet, and neither is invented here.

Tests: Node 255 (was 240). New `pms/test/occupancy-registration.test.js` covers per-person rows, unnamed occupants, both placement bases, missing names, unassigned rooms, the penalty kept separate from room charges on the commission page, and charges without a business date staying out of the totals. `pms/test/financial-ui.test.js` gained a case asserting that occupant, guest and channel text are escaped, that all three pages keep their filters editable on a rejected range, and that no zero commission is printed anywhere. New `verification/dom-occupancy.mjs` books two arrivals with full names, one with a missing name and no room, and a channel booking with part of the bill received, then checks the headcount, the missing-name and unassigned counts, the placement switch, and that the commission total reads *not recorded*. All existing DOM scripts still pass, including `dom-workflows`. No new runtime files were added and no backend file was changed, so the release-install constraint is unaffected and this batch can be fully verified from outside the server.

Remaining gaps these pages expose rather than hide: no room-group field exists, so grouping is by room type or unit only; rate plans are still not linked to orders; and channel commission needs a stored rate or real settlement data before it can be anything other than *not recorded*.

## Team access update (2026-11-02)

A first real **Team & access** page now exists under Settings, backed by server-enforced changes rather than by a UI convention. It is in `pms/web/workspace-ui.js` (`teamAccessPage`, `teamWords`); the enforcement and storage are in `pms/server/store.js` (`saveMember`, `actionsFor`, `propertyRole`, `visibleMembers`, `visibleMemberAudit`).

- **A property role overrides the account role.** An account keeps one default role, and each property may override it. One person can run operations in one property and only read in another. The override is what the server checks for every business command, so a widened role in the browser changes nothing: `memo_save` succeeds in the property where the account is operations and returns 403 in the property where it is still a viewer.
- **Only account administrators manage members, and only inside properties they share with that member.** An administrator of one property cannot see, list or change the staff of another; the members list and the audit trail are both filtered to shared properties. A property-level admin override does not grant member administration either.
- **Nobody edits themselves through this page.** Self-changes are refused, because the page is exactly where a mistake would lock the account out of its own access.
- **The last active administrator cannot be demoted or disabled.** The refusal happens before the write instead of being discovered afterwards.
- **Disabling ends sessions immediately** and blocks the next sign-in; changing a password signs that account out everywhere. Both are applied in the same transaction as the change.
- **Every change is audited in its own append-only table** (`member_audit`, with update and delete triggers). It records who acted, who was changed, the role, the property scope, the property overrides, whether the password changed, and the previous values. Member administration is deliberately not folded into a property revision, because it is not property state.
- **Team changes are idempotent** under the same request key like every other command, so a retry replays instead of writing a second audit entry.
- **The page states what each role actually allows**, in all three languages, and shows a read-only explanation instead of a form to anyone who cannot use it.

**One deliberate test change.** `test/inventory-actions.test.js` compared the whole `read()` payload to prove that a refused and a stale write change nothing. That payload now carries the member list, so the comparison was narrowed to the property state it was actually about - orders, blocks, audit and revisions - while member administration is compared separately. The assertion was not dropped; it was pointed at what it meant to protect.

Tests: Node 267 (was 255). New `pms/test/member-access.test.js` covers creation and auditing, the property override deciding a command in one property and refusing it in another, non-administrators and property-level admin overrides both being refused, cross-property members being invisible and unreachable, out-of-scope properties and malformed roles being rejected, self-edits, the last-administrator guard, session and login behaviour on disable and password change, replay on a repeated key, and the page escaping account and property text while giving no form to anyone without permission. New `verification/dom-team-access.mjs` signs in as an administrator, creates a member through the page, gives it an operations override in one property, then signs in as that member and checks that the new-booking control is enabled in one property and disabled in the other. All existing DOM scripts still pass.

**Verification limit for this batch.** This one changes `server/store.js`, and the server does not serve anything under `/server/`, so the backend half cannot be confirmed from outside. On the host, check `grep -c saveMember /opt/jovian-pms-test/current/server/store.js` and `grep -c member_audit /opt/jovian-pms-test/current/server/store.js`; both should be non-zero. The new table is created on startup and the `user_properties.role` column is added to existing databases on startup, so no manual migration step is needed, but a backup is taken by the release script as usual.

Still not done: no password reset email or self-service recovery for non-administrators; no per-action grants beyond the four roles; no invitation flow that sends anything (nothing is ever emailed or messaged automatically); and team access has no link yet to door-lock or OTA credentials.

## Property site update (2026-11-02)

A property can now publish a public site of its own. The settings page is in `pms/web/workspace-ui.js` (`propertySitePage`, `siteWords`); storage, authorisation and public reads are in `pms/server/store.js` (`saveSite`, `publicSite`, `publicAvailability`, `visibleSites`, `visibleSiteAudit`); the page itself is server-rendered in `pms/server/http.js` (`renderPropertySite`, `pickSiteLanguage`).

- **Nothing is reachable until it is published.** A site is a draft by default. `publicSite` only answers for `enabled` sites, so an unpublished property returns 404 to the whole internet, not a page with content hidden by CSS or JavaScript.
- **Publishing is administrator-only inside the property.** Operations cannot publish public content, and an administrator of one property cannot publish another's. A property-level admin override does not reach here, because what is published is public.
- **The address slug is constrained and unique** to lower-case letters, digits and hyphens, and enabling a site without one is refused, so no site can be silently unreachable while looking published.
- **Only this property's own live room types and rate plans can be published.** A slug, a room type or a plan belonging to another property is rejected, so a site cannot advertise inventory or prices from somewhere else.
- **A price is only reported when every night of the stay actually has one.** Prices come from the rate plans the administrator chose to publish. If a single night has no published price, the whole stay is shown as *no published price* rather than being estimated from another night. If no plan is published at all, no price is shown anywhere. This is the same rule the front desk sells under, read from the same inventory.
- **Availability is read from real inventory**, including the reservations and blocks the front desk already has, so the public page can never offer a room that is already sold. Where it cannot be confirmed the page says so instead of showing a number.
- **The page takes no booking, and says so on every page in all three languages.** No payment gateway is connected and nothing is emailed or messaged automatically, so the site shows room types, availability and contact details and leaves the booking to a person. There is no form that pretends to confirm a reservation.
- **The page carries no script at all.** It is server-rendered, works without JavaScript, and its Content-Security-Policy is `default-src 'none'` with only inline styles allowed. A search is a plain GET form. Every value rendered - including the query string - is escaped.
- **Language is chosen from the request** (`?lang=`, otherwise `Accept-Language`, otherwise English) and each of the three languages is stored separately, so one language never leaks into another's empty field.
- **Publishing is audited in its own append-only table** (`site_audit`), recording who published what and what it replaced, including the previous publication state and content. It is deliberately not folded into a property revision, because publishing is not property state.

**One correction made while testing.** Two audit entries written in the same millisecond could come back in either order, so the newest publishing change could be displayed as an older one. `visibleSiteAudit` now orders by time and then by insertion order, which makes it deterministic.

Tests: Node 280 (was 267). New `pms/test/property-site.test.js` covers drafts being unreachable, administrator-only publishing, slug rules and uniqueness, cross-property room types and plans being rejected, per-language text being trimmed and bounded, availability following a real booking, a stay being unpriced when one night lacks a price, date and guest bounds, auditing what was replaced, per-property visibility, escaping, language choice and the rejected-range message. New `verification/dom-property-site.mjs` signs in as an administrator, publishes through the settings page, then opens the public page without a session and checks the title in three languages, the contact details, the ten available rooms, the absence of any script, the honest no-price message, that unpublishing puts the site out of reach, and that a hostile query value is escaped. All existing DOM scripts still pass.

**This batch's backend half was confirmed from outside after all.** The public route answers before the static asset whitelist, and it replaces the Content-Security-Policy with `default-src 'none'`, so the two are distinguishable without a session: `curl -sD - -o /dev/null https://pms.jovianhome.com/sites/no-such-property` reports `default-src 'none'` while any `/web/...` path still reports the application-wide `default-src 'self'` policy. Measured on the deployed site, which proves the new `server/http.js` is running and that a release restarts the service - so the earlier `server/store.js` batches that could not be confirmed at the time (team access, and the member tables) are running too. Note that a HEAD request cannot be used for this check: it never reaches the route because the origin check rejects it first.

Still not done: no booking request is collected or stored, so a guest cannot yet ask for a reservation from the site; no payment, no channel connection and no automatic message; no room group, no photos, no map and no per-room description on the public page; and nothing is indexed for search engines on purpose.

## Test booking cleanup, and a real bug it exposed (2026-11-02)

A property can now clear its own test bookings. The page is in `pms/web/workspace-ui.js` (`dataMaintenancePage`, `cleanupWords`); the command is `purge_test_orders`, implemented in `pms/src/demo-store.js` and audited in `pms/server/store.js`.

- **It deletes, it does not cancel.** Cancelling would leave a batch of cancelled revenue sitting in the accounts. Clearing removes the stays outright, so the ledger ends up as if they never existed.
- **Only stays whose guest name begins with the prefix given are touched**, case-insensitively. `TEST` matches `TEST alpha` and `test lower`; it does not match `Contest three`. A real booking can only be caught if someone deliberately types its name into the prefix field.
- **A blank prefix falls back to `TEST`, never to "everything".** This is the one input that could otherwise have turned a targeted cleanup into a wipe.
- **Matching nothing is refused** with `nothing_to_purge` instead of reporting a success that deleted nothing, and the revision is not advanced.
- **A booking record left with no stays goes with them**, and the nights become sellable again immediately.
- **What was removed is written into the audit**: each stay's id, guest name, arrival, departure and the state it was in. The deletion is never silent, and the orders themselves cannot be recovered.
- **Administrator-only, inside the property.** Operations and viewers cannot run it, an administrator of one property cannot clear another's, and clearing one property leaves every other property untouched.
- **The page counts first**: it lists what would go, says how many would be kept, names the matching rule, and asks for confirmation before writing anything. With nothing to delete, the button is disabled.
- It is idempotent under its request key, like every other command.

**The bug this exposed.** While driving the page from a DOM script, the delete button did nothing. The cause was not in the new code: `web/app.js` had a `change` listener for the finance report filters whose opening line was never closed until far below, so **every listener inserted after it - the new member form, the property site form, and the member row buttons - was being registered inside its callback**. Those controls only became live after someone happened to change a report filter. The earlier DOM scripts passed only because they happened to fire a `change` event before clicking. The listener now closes after its own body, and all of them are registered at module scope. This is worth knowing because it means **the member and property site pages shipped in a state where their buttons did nothing until a filter was touched**; that is fixed here.

Tests: Node 292 (was 280). New `pms/test/data-cleanup.test.js` covers targeted deletion, case-insensitive prefix matching, prefix-at-start-only, the blank prefix fallback, refusal when nothing matches, the audit contents, administrator-only and per-property isolation, booking records with no stays, idempotency, the reducer refusing without mutating, and the page escaping guest names, counting per property and offering no form without permission. New `verification/dom-data-cleanup.mjs` signs in as an administrator, opens the page, checks the counts, clicks delete, and proves the confirmation was asked for, the real booking survived and the removed ones are in the audit. Every existing DOM script still passes, and the two that previously depended on an accidental `change` event now pass on their own.

Still not done: nothing is scheduled, there is no undo, and the prefix is typed by hand - a property wanting a recurring cleanup still has to click. No booking request is collected from the public site yet, and no payment or channel is connected.

## Booking requests from the published site (2026-11-03)

A guest can now ask for a room from a published property site, and the desk decides. The page is in `pms/web/workspace-ui.js` (`bookingRequestsPage`, `requestWords`) with its action in `pms/web/app.js`; public submission, storage and the decision are in `pms/server/store.js` (`submitBookingRequest`, `bookingRequestCommand`, `decideBookingRequest`, `visibleBookingRequests`) and the route in `pms/server/http.js`.

- **A request is not a booking.** It is stored as `pending`, the guest is handed a reference, and the page says in all three languages that this is not a confirmation and that nothing has been charged. No payment gateway is connected, so nothing here could honestly confirm or charge.
- **The form needs no script and no session.** Like the rest of the site it is server-rendered under `default-src 'none'`, so a request can be sent with JavaScript off. It posts to `/sites/<slug>/request`.
- **Post, then redirect.** A submission answers 303 back to the page with `sent=<reference>`, or with `requestError=<code>`. Reloading the result never sends the request twice.
- **Anyone on the internet can reach it, so it is rate limited by caller** (20 per 15 minutes) and every field is bounded: name 100, contact 254, note 2000, dates within 31 nights, party 1 to 20.
- **Nothing unacceptable is queued.** Dates, party size, the room type's own capacity and whether the property actually publishes that room type are checked before the write, and a bed can only be asked for by one person. A room type belonging to another property is refused.
- **Accepting is rewritten into the reservation it becomes.** The command builds an ordinary `create_reservation`, so a stay coming from the site goes through exactly the same inventory, revision, claims and audit rules as one taken at the desk, and the audit carries the request id it came from. It reserves, it does not check anyone in, and no room is assigned.
- **The price is the one the guest was quoted.** Accepting uses the nightly prices published when the request was made, not a fresh calculation, so the desk cannot silently re-quote. Where no price was published the booking is created at zero and the page says the rate has to be filled in by hand; no price is ever invented.
- **Declining only records why.** No inventory moves, no revision advances, no booking appears, and the reason is kept with the request. A reason is required.
- **A request is decided once.** A second decision is refused with `request_state`, and the same request key replays the stored answer instead of writing a second one. Only operations and administrators of that property decide, and a request raised for another property is neither visible nor decidable here.
- **Every step has its own append-only trail** (`booking_request_events`), including the submission, which has no account and is recorded as `public`.

Tests: Node 305 (was 292). New `pms/test/booking-request.test.js` covers undecided storage with no booking, inventory or money, drafts and unknown slugs being unreachable, unpublished and cross-property room types being refused, date and capacity rules, required and bounded text, accepting at the quoted price, accepting taking real inventory and being refused rather than overselling when none is left, declining recording a reason and nothing else, one decision per request, role and scope limits, replay and key mismatch, a missing reason being refused, the zero-price path, and the event table refusing update and delete. New `verification/dom-booking-requests.mjs` drives the whole round trip: publish from the settings page, ask on the public page, get a reference rather than a confirmation, see the request at the desk with the quoted price, accept it into a booking priced as quoted, then decline a second one and check that only a reason is left behind.

Still not done: nothing is ever emailed, messaged or shown as a notification, so a request can sit unseen until someone opens the page; one request is one room, so a party wanting several rooms asks several times; there is no captcha or spam filtering beyond the rate limit; the guest gets no way to check on or withdraw a request; and there is still no payment, deposit or channel connection, so accepting creates a booking that the desk settles by hand as usual.

## Notices: telling the desk that something arrived (2026-11-03)

A request from the published site was being stored correctly and then sitting there, unseen, until somebody happened to open the requests page. The accounts that can act on a request are now told. The page is in `pms/web/workspace-ui.js` (`notificationsPage`, `noticeWords`), the bell and its poll are in `pms/web/app.js` and `pms/web/index.html`, the style in `pms/web/workspace.css`, and the storage, feed and read command are in `pms/server/store.js` with the route in `pms/server/http.js`.

- **A notice is raised for the people who can act on it, and only those.** An operator and an administrator of that property are told; a viewer is not, because a viewer cannot decide on it; a switched-off account is not; another property is never told about this one; and a property role override is what decides, not the account role. The first source is a booking request arriving from a published site.
- **Nothing is delivered anywhere.** No email, SMS or push is connected, so a notice is stored, not sent, and is only seen by signing in. The page says this in all three languages so nobody mistakes it for a message that reached somebody.
- **The header carries a bell with the unread count.** It polls a small feed, `GET /api/notifications`, rather than the whole state, and only reloads when the count actually changed, so a page somebody is working on is not disturbed for nothing. A dialog that is busy is never reloaded underneath. A failed poll stays silent on purpose.
- **Reading is only ever reading.** It is a personal, append-only record that advances no revision, touches no inventory, creates no booking and decides nothing: the request it points at stays undecided until a person accepts or declines it.
- **A notice is a record.** It cannot be rewritten, having read one cannot be undone or backdated, and a notice addressed to somebody else is not readable. The same request key replays its answer instead of reading twice, and a reused key carrying a different body is refused.
- **The list only acts where it can.** Only the current property's notices can be acted on; unread ones in other properties are counted and shown as a number, because reading across properties would have to be sent against another property's revision.

Tests: Node 315 (was 305). New `pms/test/notifications.test.js` covers who is told and who is not, property isolation, a role override deciding, reading changing no revision, order or request, another account's notice being unreadable, marking a whole property read leaving other properties alone, replay and key mismatch, the unread count, the notice and its read state refusing update and delete, and unread coming first. New `verification/dom-notifications.mjs` drives it end to end: a guest asks on the public site, the feed reports one thing waiting, the bell shows it, the notice opens the requests page without deciding anything, and reading it clears the bell and still leaves the request for a person to decide.

Still not done: the only source is a booking request, so nothing else raises a notice yet; the count is only noticed on a poll, so it can be up to a minute behind; there is no sound, badge on the browser tab, or anything outside an open page; nobody is told when a request has been waiting a long time; and a notice can still be missed entirely if nobody is signed in or the tab is closed, because nothing is delivered.

### Standing notices: the work still waiting (2026-11-03)

The first version could only notice something happening, so everything that was simply still wrong stayed invisible until somebody went looking. `pms/server/store.js` now also raises notices for facts still standing, worked out from the property each time rather than stored (`derivedNotifications`).

- **What is raised.** A guest who should have arrived and did not; a guest still in a room they should have left; a booking arriving today that has not been given a room; rooms still needing cleaning, counted in a single notice rather than one per room; and a booking request nobody has answered for more than a day. Only required night-audit exceptions are raised, because advisory ones would only add noise.
- **They disappear by themselves.** Because they are facts rather than events, dealing with one makes it stop: give the room, clean the room, decide the request, and the notice is gone. Nothing has to be dismissed by hand and nothing lingers as a message about something already done.
- **A request is chased after a day, not the moment it arrives**, so a request sent at night is not presented as overdue by morning.
- **The same rule decides who is told.** Only an account that can act on it is told: a viewer is told none of it, and an operator is told what an operator can do.
- **Reading works the same way as before**, including for a standing fact, which has no stored row of its own: it advances no revision and decides nothing. An id nobody is being shown is not readable.
- **The feed no longer trusts its caller.** It reads the account from the table instead of taking a role on trust, so what may be raised is decided by the stored role. Without this, a caller passing only an id would have had every standing notice silently filtered out by a permission check against no role at all.

Tests: Node 322 (was 315). Seven cases were added to `pms/test/notifications.test.js` for the arrival that never arrived and the departure that never left, an arrival with no room that stops once a room is given, dirty rooms counted once and clearing when cleaned, a request chased after a day but not before and stopping once decided, a viewer being told none of it, reading a standing notice and a made-up id being refused, and marking a whole property read clearing standing notices too. `verification/dom-notifications.mjs` now also drives a guest due today with no room: two notices reach the bell, they say what is still wrong, the notice opens the booking without deciding anything, and reading clears the bell.

Still not done: these are still only seen by somebody who is signed in, so a property with nobody watching misses all of it; the notice is only as fresh as the poll; there is no sense of priority beyond unread coming first, so a room needing cleaning sits next to a guest who never arrived; and nothing here decides anything, so a notice can be read and then ignored just as easily as before.

## Notice priority, and finishing the self-check-in line (2026-11-03)

A notice was ordered by whether it had been read and by the clock, and by nothing else. That put a room needing cleaning next to a guest who should have arrived hours ago, which is not the order anybody would work in. Every notice now carries how much it matters, in `pms/server/store.js` (`severityOf`, `noticeSeverity`), and the list is read by it: **what is waiting on a person comes first, then what has not been read, then the newest.**

- **Urgent** - a guest who should have arrived and did not, one who should have left and has not, a booking arriving today with no room, and a registration handed in that is waiting on somebody to check it. Somebody is standing behind each of these.
- **Attention** - a booking request arriving from the published site, and one left waiting more than a day. Somebody will have to answer it, but nobody is waiting at the door.
- **Routine** - rooms needing cleaning.
- A kind nobody has classified is not invented as urgent; it waits behind the people who are here.
- The level is **written out as a word in its own column**, so a colour is never the only thing carrying the meaning. It is also on the row itself, which is what the DOM check asserts: with an overdue arrival and two dirty rooms on the list at once, the urgent row comes before the routine one.

Self-registration now ends where it always ended, with a person, and that is finally raised as a notice (`checkin_review`, also in `derivedNotifications`):

- **Identity handed in and waiting to be checked is work standing**, so it is raised for the accounts that can check it - operations and administrators of that property, honouring the property role override - and it stops the moment it is reviewed, exactly as every other standing fact does.
- **Only while self-registration is switched on.** With it off the guest's own link no longer opens, so nobody is standing behind that decision and it is not presented as work.
- **An invitation nobody has filled in is not work yet**, so it raises nothing.
- The notice **opens the review page**, which is a dialog rather than a view, and reviews nothing by itself.

A refusal used to reach the guest as a bare *review needed* with nothing to say what was wrong, so they could only guess and submit the same thing again. `sc_review` now stores the reason with the registration (`rejection_reason`, added to existing databases on startup) and it is shown on the guest's own page, escaped, and on the desk list. Registering again clears it, so an old note never keeps being shown, and an approval never carries a refusal note forward.

Tests: Node 325 (was 322). Two cases added to `pms/test/notifications.test.js` - the list never putting routine work above a person, and a registration being raised, not raised before it is submitted, not raised for a viewer, not raised while registration is off, and stopping once reviewed - and one to `pms/test/self-checkin.test.js` for the refusal reason reaching the guest and clearing on resubmission. `verification/dom-notifications.mjs` now also drives dirty rooms alongside an overdue arrival and checks the order of the rows, then drives a registration handed in and checks that the notice opens the review dialog still undecided. All 16 DOM scripts and Python 5/5 still pass.

**Verification limit for this batch.** `pms/server/store.js` and `pms/server/self-checkin.js` changed, and the server serves nothing under `/server/`, so the backend half cannot be confirmed from outside. On the host: `grep -c severityOf /opt/jovian-pms-test/current/server/store.js` and `grep -c rejection_reason /opt/jovian-pms-test/current/server/self-checkin.js` should both be non-zero. The served half can be checked: `web/workspace-ui.js` should carry `noticeSeverity`, `severityUrgent` and `noticeCheckinReview`, `web/workspace.css` the `sev-urgent` style, and `web/app.js` the `checkin` branch of `data-notice-view`.

Still not done: nothing is delivered anywhere, so a notice is still only seen by signing in; there is no sound, tab badge or anything outside an open page; the level is fixed per kind rather than something a property can configure, so a property that treats cleaning as urgent cannot say so; and the self-check-in line still ends at a person because no photo, selfie, OCR or automatic identity check exists. The door lock is still unconnected, so no PIN is issued, and "approved" still means approved by a person, not let in.

## A property decides its own notice priorities (2026-11-04)

The priority of a notice was fixed in code. A room needing cleaning always sat behind a guest who should have arrived, no matter what that property actually needed first, and the only way to change it was to change the program. A property can now set each kind's level itself, and **the list, the written labels and the header bell all read it that way**. The system default never changed, so a property that has configured nothing behaves exactly as before.

- **Only what a property changed is stored.** `pms/server/store.js` keeps the overrides in a new `notice_settings` table, one row per property, and `notice_settings_audit` (append-only) records who changed what and what it replaced. A level left at the system default is not written down, so it keeps following the *current* rule instead of freezing an old default into a setting. Choosing *system default* again clears the override.
- **The setting is not business state.** `notice_severity_save` is answered as a side command, like publishing a site: it never advances a business revision, never touches a booking, never raises or dismisses a notice, and never moves any money. Idempotent keys and mismatched replays behave like every other command.
- **Administrator-only for that property**, honouring a property role override: an operator, a finance account, a viewer and an administrator of another property are all refused. Only an account that can actually act in this property decides how its list is read.
- **One property cannot reorder another's.** The override is looked up by the property that raised each notice, so a property with several stores in one account can rank them differently and neither leaks into the other.
- **One source of truth.** The defaults, the known kinds and the validation now live in `pms/src/demo-store.js` (`noticeKinds`, `noticeLevels`, `noticeDefaults`, `severityOf`, `cleanNoticeLevels`), imported by both the shared backend and `pms/web/workspace-ui.js`. A level can never mean one thing in the list and another in the settings form. An unknown kind is still not invented as urgent, and a bad override falls back to the default. The local reducer uses the same validator, so a desk working without the shared backend can save its settings without the page failing.
- **The page says what it is doing.** `pms/web/workspace-ui.js` (`notificationsPage`) adds a settings form listing all seven kinds, each showing the built-in level next to the property's choice, in all three languages. Accounts that cannot change it see a read-only explanation and disabled controls. A short table shows the ten most recent changes. The earlier "the list is ordered by priority" note now says *by default*, because a property can change it.
- Input is validated server-side: an unknown kind, a made-up level, or a body that is not an object is refused. `default`, an empty string and `null` all mean *follow the system rule*.

Tests: Node **330** (was 325). Five cases in `pms/test/notifications.test.js`: a property choosing to read cleaning before a guest while another property keeps the system order (including the bell's own feed), administrator-only and scope limits, input validation plus append-only audit and clearing back to defaults, idempotency and no business state changing, and the shared constants being used by the local reducer. `verification/dom-notifications.mjs` now drives the real form: it changes two levels, submits, waits for the rows to actually swap order, checks the audit is shown, and asserts the revision and the notice count did not move. All **16 DOM scripts** and Python **5/5** still pass. All 38 runtime JS files pass a syntax check; no new runtime module was added, so the release install only refreshed existing files.

**Verified on the live service after this push (2026-11-04).** `/healthz` returns 200, which also confirms the service restarted cleanly with the new `CREATE TABLE IF NOT EXISTS` definitions and that existing data was left alone. `web/workspace-ui.js` now carries `noticeLevelTitle`, `noticeLevelDefault`, `noticeLevelReadOnly` and `notice-severity-form`; `web/app.js` carries `notice_severity_save`, `noticeSettings` and the form's submit branch; `web/workspace.css` carries the `.notice-settings` rules; `src/demo-store.js` carries `cleanNoticeLevels`, `noticeKinds`, `noticeDefaults` and `severityOf`. All 12 modules `app.js` imports and both `src/` modules `workspace-ui.js` imports return 200, so the new shared import does not break the page in a browser. The public site still answers with CSP `default-src 'none'` and `form-action 'self'`. As before, `/server/store.js` is not served (404), so the backend half is **inferred from the deployment restart**, not read from outside: on the host, `grep -c notice_settings_audit /opt/jovian-pms-test/current/server/store.js` and `grep -c cleanNoticeLevels /opt/jovian-pms-test/current/server/store.js` should both be non-zero.

Still not done: nothing is delivered anywhere, so a notice is still only seen by signing in; the levels are a fixed three rather than a numeric weight, and there is no rule such as "treat cleaning as urgent only when more than five rooms are dirty"; a property cannot set a different order for a particular shift or a particular person; and the choice is per property, not per account, so two administrators of the same store always see the same order. The self-check-in line still ends at a person, the door lock is still unconnected, and "approved" still means approved by a person, not let in.

## Multi-room public requests, and a guest's way back (2026-11-04)

A published request used to mean exactly one room, and once a guest was handed a reference there was no way back: they could not see what had happened to the request, could not take it back when their plans changed, and the desk could still accept something the guest no longer wanted. All three are now answered on the public site itself, with no session, no script and no external service.

- **One request can cover up to eight rooms of the same type.** The guest count stays *per room*, which is what the availability search already meant; the quote is for every room, and accepting the request creates **one stay per room on a single booking**, each going through the same inventory, rate and folio rules as any other multi-room stay. The desk sees the room count in its own column and in the booking's notes. A request for more rooms than are free is refused up front because it could never be accepted; a single room keeps its old behaviour, so asking when nothing is free is still recorded and it is the desk's acceptance that runs out of stock.
- **A guest can look their request up and withdraw it while it is still pending**, using the reference and the exact contact details they left. A reference is eight hex characters - short enough to guess - so it is **never treated as a secret**: without the matching contact nothing is disclosed, the answer does not say whether the reference exists, and every attempt is rate limited separately from submitting. Case and whitespace in the contact are forgiven, the value itself is not. What comes back is public facts only: status, dates, rooms, guests, the quote, and the reason a decline gave. Every field is escaped.
- **Withdrawing is not a new status.** `pms/server/store.js` keeps the original three values and adds a `withdrawn_at` marker plus an append-only `withdraw` event, so no table is rebuilt and no existing row is rewritten. Withdrawing creates no booking, moves no business revision, and stops the request being counted as waiting. **Accepting a withdrawn or already decided request is now refused before any order is built** - the final status update was guarded already, but by then an orphan booking would exist.
- **The reason a desk gives when declining is now shown to the guest** looking up their own request, so the requests page says plainly that internal notes must not be written there. The internal `withdrawn_by_guest` marker is never shown to a guest.
- **Older databases are widened on startup** with `ALTER TABLE ADD COLUMN`, as the earlier migrations did, and the insert now names its columns so a wider table cannot shift values. A database written before this batch reopens with every old request intact, meaning one room and not withdrawn.
- **Two quiet anti-spam checks** on the form submission: a hidden honeypot field and a note stuffed with more than three links write nothing at all and answer like a rate limit, so neither check reveals itself. The page still has no `<script>` and the CSP is unchanged.
- The front desk page (`pms/web/workspace-ui.js`) gains a room-count column, a distinct *withdrawn by the guest* state and the withdrawal event in its history, all in the three languages.

Tests: Node **340** (was 330). A new `pms/test/booking-request-followup.test.js` covers multi-room quoting and acceptance, room-count bounds and inventory, two-factor lookup, withdrawal and its effect on acceptance, the decline reason reaching the guest, an old database being widened without losing a row, and the real HTTP routes driving honeypot, lookup and withdrawal. `pms/test/property-site.test.js` adds rendering and escaping cases. `verification/dom-booking-requests.mjs` now drives a two-room request through the real page, then the guest looking it up and withdrawing it, and checks the desk sees a withdrawal rather than a refusal. All **16 DOM scripts** and Python **5/5** still pass; all 38 runtime JS files pass a syntax check. No new runtime module was added, so the release install only refreshed existing files.

**Verified on the live service after this push (2026-11-04).** `/healthz` returns 200, which also confirms the service restarted cleanly and the `ALTER TABLE ADD COLUMN` migration ran on startup without disturbing existing rows. `web/workspace-ui.js` carries `requestRooms`, `requestWithdrawn`, `requestGuestWithdrawn` and `requestReasonNote`; all 12 modules `app.js` imports return 200; `GET /sites/no-such-property` still answers with CSP `default-src 'none'` and `form-action 'self'`; `/server/store.js` is not served (404).

**Not verified from outside, and why.** There is no published property site on the live test service - four candidate slugs all return 404 - so the public page's `name="rooms"`, `name="company"` and `/manage` form could not be read from the internet. Those are covered instead by `pms/test/booking-request-followup.test.js` and `verification/dom-booking-requests.mjs`, which drive a real in-process HTTP server. The new columns, the lookup/withdraw methods and the manage route live under `/server/` and are **inferred from the deployment restart**, not read from outside: on the host, `grep -c withdrawn_at /opt/jovian-pms-test/current/server/store.js` and `grep -c manage /opt/jovian-pms-test/current/server/http.js` should both be non-zero.

Still not done: a request still covers only one room type, cannot be confirmed automatically, takes no payment or deposit, and offers no photos or per-room descriptions. A reference plus contact is a second factor, not a real account: anyone who learns both can withdraw a request, and there is no email or SMS to tell a guest their request was accepted. The desk's notification that a request arrived is not removed when the guest withdraws it, so somebody may still open a request that is already closed. Honeypot and link-count checks are a speed bump, not a CAPTCHA. The self-check-in line still ends at a person, the door lock is still unconnected, and "approved" still means approved by a person, not let in.

## Conditional notice rules: a backlog earns its urgency (2026-11-04)

A property could already say how much each kind of notice matters to it. It could not say that a kind only becomes urgent *when there is enough of it*. Now it can. This is the second half of the same settings idea, kept deliberately separate: a level is a fixed choice, a rule is a condition on a fact that is still standing.

- **Only countable facts can have a rule.** `pms/src/demo-store.js` defines `noticeRuleKinds = ['rooms_to_clean','request_waiting','checkin_review']`. Cleaning carries the number of dirty rooms; a waiting request and a registration waiting for review each carry how many of that kind are outstanding at this property. Stored events (a request arriving) have no size, so no rule can be written for them. `derivedNotifications()` in `pms/server/store.js` attaches a `magnitude` to each of the three; with no rule the list is exactly as it was, including the bell feed.
- **A rule reads "when there are at least N, treat it as this level".** `cleanNoticeRules()` accepts only a known kind, a whole threshold 1–99 and a real level; `default`, an empty string and `null` remove a rule. `escalateSeverity()` applies it after `severityOf()` — that is, after the system default and any property override — and **can only raise a notice towards the top**. A rule can never push a guest waiting at the door behind routine work, and a level no more urgent than the base changes nothing. The list marks an escalated row so a reader can see a rule, not the default, decided it.
- **It is a setting, not business state.** `notice_rule_save` is answered as a side command like `notice_severity_save`: administrator-only for that property (honouring a property role override), idempotent by request key, isolated to one property, and never advancing a business revision, touching a booking, raising or dismissing a notice, or moving money. `notice_rules` and `notice_rules_audit` are new tables created with `CREATE TABLE IF NOT EXISTS` on startup, so older databases gain them without a rebuild or rewriting any old row. The audit is append-only (triggers refuse `UPDATE` and `DELETE`) and records the previous and next rules.
- **One source of truth, both runtimes.** The kinds, validator and escalation function live in `pms/src/demo-store.js` and are imported by `pms/server/store.js`, `pms/web/workspace-ui.js` and the tests. `apply()` accepts `notice_rule_save` locally, stores `noticeRules` in the state, and recomputes every severity from the default, the property level and the rules together, so saving one setting cannot leave a stale level behind. `seed()` carries `noticeRules: []`.
- **The page says what it is doing.** `notificationsPage()` adds a third panel with a form over the three countable kinds, each showing the built-in level, a threshold and a level to raise to, in all three languages. Leaving the count empty disables that row. Accounts that cannot change it see a read-only explanation and disabled controls; the ten most recent changes are shown with what each replaced. The note states plainly that a rule changes only the order and label of standing facts at this property, sends nothing anywhere, and advances no revision.
- No new runtime module was added: the served half is confined to existing `pms/web/workspace-ui.js`, `pms/web/app.js`, `pms/web/workspace.css` and `pms/src/demo-store.js`.

Tests: Node **348** (was 340). Eight cases added to `pms/test/notifications.test.js`: the default being unchanged and cleaning rising only once three rooms are dirty (plus the bell feed, the escalated flag, and the fact disappearing when cleaned), a rule never pushing an urgent notice down, two waiting requests being counted as a backlog and falling back once one is decided, a rule combining with a property level for registrations, administrator-only and scope limits, input validation plus an append-only audit and clearing back to defaults, idempotency and no business state changing, and the shared constants being used by the local reducer. `verification/dom-notifications.mjs` now resets the priorities, submits the real rule form, waits for the rows to swap order, checks the escalated tag and the audit, and asserts the revision and the notice count did not move. All **16 DOM scripts** and Python **5/5** still pass; all **38** runtime JS files pass a syntax check.

**Verified on the live service after this push (2026-11-04).** `/healthz` returns 200, which confirms the service restarted cleanly with the two new `CREATE TABLE IF NOT EXISTS` definitions and that existing data was left alone. `web/workspace-ui.js` now carries `noticeRuleTitle`, `noticeRuleAtLeast`, `notice-rule-form`, `data-notice-rule-at-least` and `noticeRuleEscalated`; `web/app.js` carries `notice_rule_save` and `noticeRules`; `src/demo-store.js` carries `noticeRuleKinds`, `cleanNoticeRules` and `escalateSeverity`; `web/workspace.css` carries the `input[type=number]` rule. All 12 modules `app.js` imports and both `src/` modules `workspace-ui.js` imports return 200. The public site still answers with CSP `default-src 'none'` and `form-action 'self'`.

**Not verified from outside, and why.** `/server/store.js` is not served (404), so the new tables, the side command and the `magnitude` on derived facts are **inferred from the deployment restart**, not read from outside: on the host, `grep -c notice_rules_audit /opt/jovian-pms-test/current/server/store.js` and `grep -c cleanNoticeRules /opt/jovian-pms-test/current/server/store.js` should both be non-zero. The rule form itself is served under `/web/` and was read from outside; its behaviour (the row order actually flipping) is covered by the in-process DOM script, not by a browser on the live service.

Still not done: a rule is per property, not per shift or per person, so two administrators of the same store still see the same order and nobody can say "urgent only on the night shift"; thresholds are a plain count rather than a time or money measure; nothing is delivered anywhere, so a notice — including an escalated one — is still only seen by signing in. The self-check-in line still ends at a person, the door lock is still unconnected, and "approved" still means approved by a person, not let in.

## The desk finishes the job: check-in from an approved registration (2026-11-04)

An approved self-registration used to be a dead end. A person at the property verified the identity details, the guest's page said "approved", and nothing in the system had actually checked the guest in: the only code path that moved an order to `checked_in` lived behind a real door-lock device confirmation, which is deliberately unconnected. The desk had to leave the dialog and do a separate manual check-in, re-typing the names it had just approved.

Now the review dialog offers a separate, explicit action: **Check in now**. It is available only when the registration is approved and every condition a guest's own access request would have to satisfy is also satisfied, and only to `admin` / `operations` for that property.

- **Approval is still not a door opening and still not check-in.** `sc_checkin` is a deliberate human action; it issues no PIN, calls no lock provider and creates no `sc_access` row. The `disconnected` provider is untouched and the guest's page still says the lock is unconnected.
- **It runs the real business check-in.** `checkinFromGrant()` in `pms/server/self-checkin.js` calls `store.command(actor, {type:'checkin', ...})`, so the same inventory, folio, room-state, business-date, revision and audit rules as a manual check-in apply. `store.transaction()` is a plain `BEGIN IMMEDIATE` and cannot be nested, so `sc_checkin` is answered on a separate path outside the `sc_*` command transaction.
- **Every guest-side gate still applies.** It reuses `conditions()` — approval, `approved_sig` matching `signature(order)`, an active reviewer with desk authority, arrival/departure window, payment, deposit, assignment, cleaning, blocks, occupancy and registered names — plus the `confirmed` state the business command insists on. `beforeApply` re-checks the live grant inside the check-in transaction and copies the approved names into `order.occupants` in that same transaction, so no state is ever visible with an approved registration but empty occupant names. The property-local date is computed server-side, never taken from the browser.
- **Idempotent and audited.** `sc_receipts` answers a replay of the same request key; a different fingerprint on that key is refused. `sc_audit` gains one append-only `sc_checkin` row per successful action. `read()` exposes `checkinReady` and `checkedIn` per grant so the page can say what is waiting and what is done. Checking in does not undo the approval.
- **The page states the boundary.** `pms/web/checkin-admin-ui.js` adds a separate panel in the review dialog with a confirmation, in all three languages, stating that approval only confirms identity and that the action updates room status, folio and the business record but does not open a door or issue a lock PIN. The list marks "approved, ready to check in" and "already checked in".
- No new runtime module was added: the served half is confined to existing `pms/server/self-checkin.js`, `pms/web/checkin-admin-ui.js` and `pms/web/workspace.css`. The only new file is a test.

Tests: Node **356** (was 348). A new `pms/test/self-checkin-desk.test.js` adds eight cases: a successful desk check-in writing the approved name into the stay with no PIN and no provider call, idempotency and a non-doubling audit, seven gates (unapproved, unpaid, unassigned, dirty, before arrival, disabled reviewer, held deposit) refusing without touching the stay, a held deposit being settled and then checked in, no double check-in and a room change invalidating the approval, role and property scoping, stale/unknown/malformed input, and two occupants. `verification/communications-dom.mjs` now drives the whole flow over real in-process HTTP: registration, review, then the one-click desk check-in, asserting the order becomes `checked_in`, the approved name is the occupant, no `sc_access` row exists and the audit has one `sc_checkin` row. All **16 DOM scripts**, Python **5/5** and all **38** runtime JS syntax checks still pass.

**Verified on the live service after this push (2026-11-04).** `/healthz` returns 200. `web/checkin-admin-ui.js` now carries `sc_checkin`, `checkinAtDesk`, `checkin-at-desk`, `checkinDeskReady` and `checkinAlready`; `web/workspace.css` carries `checkin-desk-action`. All 12 modules `app.js` imports return 200. The public site still answers with CSP `default-src 'none'` and `form-action 'self'`.

**Not verified from outside, and why.** `/server/self-checkin.js` and `/server/store.js` are not served (404), so `checkinFromGrant()`, the `sc_checkin` permission and the `checkinReady` field are **inferred from the deployment restart**, not read from outside: on the host, `grep -c checkinFromGrant /opt/jovian-pms-test/current/server/self-checkin.js` and `grep -c sc_checkin /opt/jovian-pms-test/current/server/self-checkin.js` should both be non-zero. The dialog is served under `/web/` and was read from outside; its behaviour is covered by the in-process DOM script, not by a browser on the live service.

Still not done: the door lock is still unconnected, no device ever issues or revokes a PIN, and the guest still cannot open a door. Identity review is still a person reading text, with no photo, selfie, SMS or OCR. The device-confirmed path in `requestAccess()` still checks a guest in automatically when a real provider confirms a lock; that branch is untested against real hardware. A desk check-in is a separate deliberate action and cannot be undone from this dialog.

## Finance records what the channel actually invoiced (2026-11-04)

The commission page used to be honest but inert. It said plainly that no order stored a commission, that no channel rate was configured and that no settlement arrived from anywhere, so every figure was left empty for a person to reconcile an invoice by hand. That was the right refusal to invent a rate, but it also meant the system could never hold the one number finance actually has: the amount on the channel's invoice. It now can, without ever calculating one.

- **It is an entry, not a rate.** `commission_save` in `pms/server/store.js` is a business command restricted to `admin` and `finance` (honouring property role overrides). It advances the business `revision` and writes an append-only audit row carrying `commissionChange` with the previous and next figure, so a correction keeps the old amount on the record. The order stores `order.commission = {amount, reference, note, at, actor, settledAt, settledBy}`. Nothing is derived from the room price, no channel rate is configured, and no OTA settlement feed is faked.
- **Validation is shared by both runtimes.** `apply()` in `pms/src/demo-store.js` and `Store.command()` accept the same input: a whole number of minor units between 0 and 100000000, a non-blank invoice reference of at most 100 characters, a note of at most 500, and a boolean settlement flag. A missing order is refused with `scope`; a failed attempt writes nothing at all. Recording a commission never touches `charge`, `paid`, `outstanding`, `status`, `nightly` or `transactions`.
- **Empty stays stay empty.** `commissionDetail()` in `pms/src/financial-reports.js` still returns `commission:null`, `commissionRecorded:false` and `settlement:'unrecorded'` for a stay nobody has reconciled, and the totals `commission` is `null` rather than `0` unless at least one stay has a recorded figure. Channels are bucketed with `recorded`, `settled` and `unrecorded` counts, so a bucket with no entry never prints a zero. Recorded rows carry the invoice reference, note and either `recorded` or `settled`.
- **Only the accounts allowed to write see a form.** `commissionPage()` takes `can` from `pms/web/app.js`; `admin` and `finance` get a form over the property's non-cancelled orders, and everyone else gets a read-only explanation in all three languages. The form says to enter the actual amount from the channel invoice, never an estimate, and that recording is audited and can be corrected. `pms/web/workspace.css` styles it.
- **A long-standing display fault was fixed in the same place.** The totals table had been passing the booking count and the room-night count through `currency()`, so three bookings rendered as `MYR 0.03` and seven nights as `MYR 0.07`. Counts are now plain integers, matching the occupant and registration reports; only money columns are formatted as money.
- No new runtime module was added: the served half is confined to existing `pms/server/store.js`, `pms/src/demo-store.js`, `pms/src/financial-reports.js`, `pms/web/financial-ui.js`, `pms/web/app.js` and `pms/web/workspace.css`. The only new file is a test.

Tests: Node **365** (was 356). A new `pms/test/commission-record.test.js` adds eight cases: an unrecorded stay staying empty rather than printing a zero, finance recording an invoiced amount and the report reading it back, settlement state and corrections being audited with the report following the latest value, operations and viewer being refused with no write, all input bounds, a missing order and the booking's own figures being untouched, two channels bucketed separately, and the local reducer using the same validation. `pms/test/financial-ui.test.js` adds a case for the permissioned form, escaping of the invoice reference, the recorded and settled labels, and counts staying integers. `verification/dom-occupancy.mjs` now drives the real page: an administrator records `DOM-INV-1` for 12.34 against the channel stay, checks the other two stays still say not recorded and that no booking figure moved, then corrects it to 15.00 marked settled and checks both writes are in the audit. All **16 DOM scripts**, Python **5/5** and all **38** runtime JS syntax checks still pass.

**Verified on the live service after this push (2026-11-04).** `/healthz` returns 200. `web/financial-ui.js` carries `commissionRateNote`, `commissionRecordTitle`, `commissionReadOnly`, `commissionUnrecordedCount`, `commission-form` and the `kind==='count'` branch; `web/app.js` carries `commission-form` and `commission_save`; `src/financial-reports.js` carries `commissionTotal`, `recordedOn` and `commissionReference`; `src/demo-store.js` carries `commission_input`; `web/workspace.css` carries `commission-form`. All 12 modules `app.js` imports and both `src/` modules `workspace-ui.js` imports return 200. `GET /sites/no-such-property` still answers 404 with CSP `default-src 'none'; ... form-action 'self'`.

**Not verified from outside, and why.** `/server/store.js` is not served (404), so the `commission_save` permission and the `commissionChange` audit field are **inferred from the deployment restart**, not read from outside: on the host, `grep -c commission_save /opt/jovian-pms-test/current/server/store.js` and `grep -c commissionChange /opt/jovian-pms-test/current/server/store.js` should both be non-zero. The form itself is served under `/web/` and was read from outside; its behaviour is covered by the in-process DOM script, not by a browser on the live service.

Still not done: this is one invoice figure keyed by hand. There is no rate card, no automatic OTA settlement import, no reconciliation against a bank statement, no invoice attachment, and no way to say a whole statement period is closed. A correction overwrites the previous figure on the order but keeps it only in the audit, not as a readable history on the page. True channel settlement still needs the paid NOBEDS contract and real data.

## Expired guest identity documents are purged on purpose, not by a timer (2026-11-04)

Self-registration had been collecting encrypted identity documents into `sc_grants.submission` and, on the device path, encrypted PINs into `sc_access.pin`, with no retention period and no way to delete anything. A release backup copied only the SQLite database — a restore of that backup would leave the encrypted guest records permanently unreadable because the key beside the database was never part of it. Both are now addressed without ever deleting data as a side effect of something else.

- **Deleting is a deliberate, audited decision.** `retentionDays` is a per-property policy setting (default 90, allowed 1–3650) saved through the existing `sc_policy_save` command. `retention()` computes the cut-off on the server from the Malaysia UTC+8 local day and that period, counted from each stay's departure date; a browser never supplies a date. `read()` returns `{days, cutoff, eligible}` so the desk sees the cut-off and the number of registrations due **before** acting. `sc_purge_identity` is a separate command, restricted to `admin` (property role overrides honoured), requiring a second confirmation in the dialog. There is no timer, no startup sweep and no read that removes anything.
- **Only the identity payload goes.** The purge nulls `submission`, `document_hashes`, `rejection_reason` and any `sc_access.pin`, and stamps `purged_at` so the page can say why the documents are gone instead of implying the guest never registered. It never touches an order, a folio, a transaction, an idempotency receipt or the audit trail. `conditions()` permanently refuses check-in for a purged grant, and `read()` exposes `identityPurged` per grant. The append-only audit row records the cut-off, the retention period, the number of grants cleared and the number of PINs cleared — never a name, a document number or any decrypted text.
- **Older databases keep working.** `purged_at` is added with `ALTER TABLE ... ADD COLUMN` guarded by `PRAGMA table_info`, and `policy()` now merges stored bodies over `defaults()`, so a policy row saved before this batch reads the documented 90-day default with its old behaviour unchanged. The `sc_invite` insert was changed to name its columns: `sc_grants` has been widened twice, and a positional insert would start binding values to the wrong columns.
- **The release backup now carries the key.** `pms/deploy/update-vultr-test.sh` copies `self-checkin.key` from beside the database into the same 0700 backup directory, `chmod 600`, and writes a `backup-contents` line saying whether the key was included or is not there yet. This is a host-local file copy only: the key itself is never printed, logged, or shipped in a release archive. Whoever holds that backup can decrypt the guest records, so the directory needs the same protection (and, for real use, encryption) as the live key. A "database + original key" restore rehearsal has **not** been done.
- **A self-bootstrap copy had to be refreshed too.** `pms/deploy/ci/BOOTSTRAP.txt` embeds a base64+gzip copy of the four deployment scripts with a SHA-256 checksum, and `pms/test/test_release_archive.py` asserts that copy equals the repository files. Changing the backup script made that test fail — a real deployment fault, since a fresh server would have installed the old script and silently lost the key backup. The payload and digest were regenerated from the current sources (deterministic gzip with `mtime=0`), and the Python test passes again.
- No new runtime module was added: the served half is confined to existing `pms/server/self-checkin.js`, `pms/web/checkin-admin-ui.js`, `pms/web/workspace.css` and `pms/deploy/update-vultr-test.sh`. The only new file is a test.

Tests: Node **374** (was 365). A new `pms/test/self-checkin-retention.test.js` adds nine cases: an existing policy with no retention field keeping its old behaviour and reading the default, the setting being per-property, administrator-only and range-validated, the desk being told the server cut-off and per-property due count, a stay inside the retention period never being purged, a refused non-admin attempt clearing nothing, a purge removing only the encrypted payload and PIN while the booking and its money stay intact, a purged registration being visibly purged and closed to review and check-in, idempotency by request key plus stale-revision rejection, and an older database gaining the column without rebuilding a table or losing a registration. `verification/communications-dom.mjs` now drives the full flow over real in-process HTTP: set the period to 30 days, advance the clock, see the server cut-off `2027-05-11`, purge, and assert the encrypted field is gone, one append-only audit row exists, the stay is still `checked_in` and the desk check-in button is gone. All **16 DOM scripts**, Python **5/5**, all **38** runtime JS syntax checks and all deployment shell syntax checks pass.

**Verified on the live service after this push (2026-11-04).** `/healthz` returns 200. `web/checkin-admin-ui.js` now carries `retentionDays`, `checkinPurgeTitle`, `checkinPurgePreview`, `checkinPurgeButton`, `checkinPurgeEmpty`, `checkinPurgeConfirm`, `identityPurged`, `checkin_identity_purged`, `sc_purge_identity` and `checkin-purge`; `web/workspace.css` carries `.checkin-retention`. All 12 modules `app.js` imports and both `src/` modules `workspace-ui.js` imports return 200. `GET /sites/no-such-property` still answers 404 with CSP `default-src 'none'; ... form-action 'self'`.

**Not verified from outside, and why.** `/server/self-checkin.js` is not served (404), so `sc_purge_identity`, `retention()`, `purged_at` and the admin-only permission are **inferred from the deployment restart**, not read from outside: on the host, `grep -c sc_purge_identity /opt/jovian-pms-test/current/server/self-checkin.js` and `grep -c purged_at /opt/jovian-pms-test/current/server/self-checkin.js` should both be non-zero. The release-backup change runs only on the host during a deploy; it was checked with `bash -n` and the self-bootstrap checksum test, not by watching a real deploy write a backup.

Still not done: nothing expires automatically (deliberate — a person must decide). The backup directory is not encrypted, key rotation does not exist, and no restore using "database + original key" has been rehearsed. A purge cannot be undone inside the application; recovery would mean restoring a protected backup. The device-confirmed lock path, real TTHotel hardware and any automatic identity checking remain unconnected as before.

## A counted till keeps its discrepancy until an administrator explains it (2026-11-04)

A shift handover used to snapshot only the room receipts, refunds and deposits in its window. There was nowhere to record what a person actually counted in the cash drawer, so a short or over till could not be seen, explained or approved anywhere. This batch adds an optional cash count and an administrator-only variance approval. It still never touches money: counting creates, changes and reverses no payment.

- **Only cash that really belongs in the drawer is expected.** `shiftSummary()` in `pms/src/demo-store.js` now returns `cashExpectedByMethod` and `cashExpectedTotal` alongside the existing `net` / `depositNet`. The expected figure is payments less refunds, split by method. Deposits are a liability held separately and are deliberately excluded: they are still reported in `byMethod` and `depositNet` exactly as before, but never counted as till cash. Transactions outside the handover window remain excluded.
- **Counting is optional and never guessed.** `shift_handover` accepts an optional `countedCash`, one non-negative whole number of minor units up to 100000000, validated in both the shared backend and the local reducer. When it is omitted the handover record keeps its old shape exactly — no `cashCount` field, no invented zero — so an existing handover and every older report stay unchanged. When supplied, the record stores `{counted, expected, variance, status, approval}`; a zero variance is `balanced`, anything else is `pending`.
- **A discrepancy is never silently written off.** `cash_variance_approve` is a separate business command restricted to `admin` (property role overrides honoured); `operations` may hand over but cannot approve, and neither can `finance` or `viewer`. It requires a non-blank reason of at most 500 characters, refuses a missing, uncounted, balanced or already-decided handover, and only changes `status` to `approved` while writing `{at, actor, reason}`. The counted, expected and variance figures are never rewritten, so the original shortfall stays readable on the record. It is idempotent by request key and scoped to the property: a KL command cannot reach a PG handover.
- **The durable audit keeps the facts, not guest data.** `pms/server/store.js` records `handoverCash:{counted,expected}` on a counted handover and `{handoverId,variance,reason}` on an approval. Neither carries a guest name, document or decrypted text. The permission is added only to `roleTypes.admin`.
- **The page states what was counted.** `pms/web/workspace-ui.js` adds a labelled numeric input to the handover form, a three-language note explaining that only payments less refunds are reconciled and that leaving the field blank means no count, and two new history columns: cash status and action. Each row shows expected, counted, variance and status; a pending variance shows a reason field and an approval button only to `admin`. `pms/web/app.js` validates the MYR input (`/^\d+(\.\d{1,2})?$/`), converts it with the existing `toMinor()`, omits `countedCash` entirely when the field is blank, and dispatches the approval with a confirmation. All new wording is in Chinese, English and Malay.
- No new runtime module was added: the served half is confined to existing `pms/server/store.js`, `pms/src/demo-store.js`, `pms/web/workspace-ui.js` and `pms/web/app.js`. The only new file is a test.

Tests: Node **385** (was 374). A new `pms/test/cash-count.test.js` adds eleven cases: expected till cash being payments less refunds split by method with deposits excluded, an empty shift expecting nothing, an uncounted handover keeping its exact old field set, balanced and pending counts, every invalid counted total, approval requiring a reason / a real pending count / an existing handover, an approval preserving the discrepancy and refusing a repeat, shared-backend storage and the `handoverCash` audit field, an uncounted handover writing no cash figures, the administrator-only permission with a durable reason, and idempotency plus cross-property scoping. `verification/dom-night-audit.mjs` now drives the whole flow over real in-process HTTP: an old handover says "not counted", entering 5.00 against a zero expectation shows a pending variance, an administrator types a reason and approves, the original figures stay unchanged, the control disappears, a 0.00 count is balanced without an approval button, and a blank field leaves the old record shape. All **16 DOM scripts**, Python **5/5**, all **38** runtime JS syntax checks and all deployment shell syntax checks pass.

**Verified on the live service after this push (2026-11-04).** `/healthz` returns 200 with `{"ok":true,"service":"jovian-pms","data":"test-only"}`. `web/workspace-ui.js` carries `cashStatus`, `cashCount`, `cashCountNote`, `cashExpected`, `cashVariance`, `cashNotCounted`, `cashBalanced`, `cashPending`, `cashApproved`, `cashApprove`, `cashApproveReason`, `cashApproveConfirm`, `cashApprovedBy`, `cash_count`, `cash_variance_decided`, `handover-cash`, `data-cash-approve` and `cash_variance_approve`; `web/app.js` carries `cash_variance_approve`, `countedCash`, `handover-cash`, `data-cash-approve`, `cashApproveConfirm` and `cash_count`; `src/demo-store.js` carries `cashExpectedTotal`, `cashExpectedByMethod`, `cash_variance_approve` and `cash_count`. All 12 modules `app.js` imports and both `src/` modules `workspace-ui.js` imports return 200. `GET /sites/no-such-property` still answers 404 with CSP `default-src 'none'; ... form-action 'self'`, and `/server/store.js` and `/server/self-checkin.js` remain 404.

**Not verified from outside, and why.** `/server/store.js` is not served (404), so the `cash_variance_approve` permission and the `handoverCash` audit field are **inferred from the deployment restart**, not read from outside: on the host, `grep -c cash_variance_approve /opt/jovian-pms-test/current/server/store.js` and `grep -c handoverCash /opt/jovian-pms-test/current/server/store.js` should both be non-zero. The page is served under `/web/` and can be read from outside; its behaviour is covered by the in-process DOM script, not by a browser on the live service.

Still not done: a count is a single whole-drawer figure, not a breakdown by denomination, cashier or float; there is no photo of a count sheet, no automatic daily cash-up, no link from a variance to a ledger posting, and no statement-period close or bank reconciliation. Approving a variance records a reason but does not create an adjusting transaction — the money is still only explained on paper, exactly as before. Real channel settlement, payments and door access remain unconnected.

## A property starts empty, and a corrected commission keeps both figures (2026-11-04)

Two user decisions landed in this batch. The first was about the layout: the earlier handoff had been carrying "the real 10-room and 30-bed layout is still to be confirmed" as an open item, and the user said plainly to delete it — a property should start with no rooms at all and be filled in by hand. The second followed from it: a new property must be creatable from the settings page, and once created it must contain nothing the system imagined. Both are done, and three real UI faults that only appear on an installation with no rooms were found and fixed on the way.

- **A brand-new property contains nothing.** `property_create` in `pms/server/store.js` is a business command restricted to `admin`. It accepts a name and an id matching `^[a-zA-Z0-9_-]{2,40}$`, refuses a duplicate id with `property_exists`, writes the property row at `revision 0` with `resources`, `roomTypes`, `physicalRooms`, `ratePlans`, `rateCells`, `orders`, `blocks`, `audit`, `notifications`, `noticeSettings`, `noticeRules`, `businessDate:null`, `nightAudits`, `shiftTypes` and `handovers` all empty, grants the creating administrator access to it, and writes one append-only `property_create` audit row carrying `starterInventory:'empty'`. There is no ten-room default, no thirty-bed default and no sample rate.
- **It had to be answered before `authorize()`.** Every other command is authorised against a property the caller already has; creating one cannot be, because the row does not exist yet. `property_create` is therefore dispatched above the `this.authorize(user, propertyId)` line, next to the receipt and fingerprint checks it shares with everything else, so a replayed key returns the original answer and a different fingerprint on the same key is refused with `idempotency_mismatch`. It does not go through the property reducer and does not advance a business date or a revision, because there is no business day to advance.
- **The admin with no property is a real state now.** `createUser()` had refused any account that listed no property, and `read()` had no shape for an installation whose only account is an administrator with nothing to manage. A fresh install would therefore have been unusable: nobody could sign in, so nobody could create the first property. A non-admin is still required to name a property; an `admin` is not, and `read()` returns the normal empty state plus `noPropertyYet:true` so the page can say what to do next instead of failing.
- **The settings page can create one.** `pms/web/catalog-ui.js` gains a create panel (name, code, create button) in all three languages, and `pms/web/app.js` submits it through `backend.execute(...)` like every other command. After a successful create the page switches to the new property and lands on the room-type and resource settings, which is where a person actually has to type the rooms.
- **The wording no longer promises a layout.** `catalogNote`, in all three languages, used to imply the rooms and beds were known and merely unconfirmed. It now says that every room type, room number and bed is entered by the administrator and that the system presets no count. `seed()` is untouched, so the existing demonstration properties keep exactly the rooms they had; only what a person creates is empty.
- **Three faults that only a room-less installation exposes were fixed.** An installation with no property at all threw `Property required` out of `preview()` inside `render()`, which the boot handler reported as "service connection failed" — a blank install looked like a dead server. `render()` now short-circuits on `noScope` when the selected property is not in the list. The property `<select>` is rebuilt on every render, so its `onchange` was silently lost after the first paint; switching is now a document-level delegated `change` listener. And `switchProperty()` left the property dialog open while calling `leaveDialogs()`, so a switch made from inside the picker was refused as busy; it now closes the dialog first.
- `pms/web/catalog-ui.js` also treats a property with no room types, rooms or units as empty and shows the prompt to add the first one, rather than an empty table with no explanation, and `property_input` / `property_exists` are translated so the errors read as sentences.
- No new runtime module was added: the served half is confined to existing `pms/server/store.js`, `pms/web/app.js`, `pms/web/catalog-ui.js` and `pms/web/financial-ui.js`. The only new files are a test and a DOM script.
- **A corrected commission now keeps its old figure on the page.** `commissionPage()` in `pms/web/financial-ui.js` gained a history table of the last fifty `commission_save` entries for the property, showing the previous and the next amount, the invoice reference and the settlement state, so a correction is readable without reading the audit. `pms/src/demo-store.js` gained `commissionBefore` and now records `commissionChange:{before,after}` in its own audit, matching the shared backend. The table is a record only: it posts nothing and changes no figure.

Tests: Node **397** (was 385). A new `pms/test/property-create.test.js` adds ten cases: an administrator existing with no property at all, only an administrator being allowed to create one, a new property having no resources, room types, rooms, rate plans, orders, blocks or business date, the `starterInventory:'empty'` audit row, name and code validation plus a duplicate id, idempotency and a mismatched fingerprint, an empty property still being empty after the database is reopened, an existing property being untouched, hand-entering two room types plus a private room and a three-bed dormitory and reading back four sale units, and an empty property never reporting invented stock. `pms/test/financial-ui.test.js` and `pms/test/commission-record.test.js` cover the history table and the local audit. A new `verification/dom-empty-property.mjs` drives the real page over a fresh installation: it opens the settings view, creates `COHUB-KL` on the page, switches to it, fills in two room types, one private room and one three-bed dormitory through the ordinary dialogs, and asserts four sale units and the cleaning state. All **17 DOM scripts**, Python **5/5**, all **37** runtime JS syntax checks and all deployment shell syntax checks pass.

**Verified on the live service after this push (2026-11-04).** `/healthz` returns 200 with `{"ok":true,"service":"jovian-pms","data":"test-only"}`. `web/catalog-ui.js` carries `newPropertySave`, `newPropertyNote`, `catalogEmptyNote` and the rewritten `catalogNote`; `web/app.js` carries `property_create`, `new-property-save` and `const noScope`; `web/financial-ui.js` carries `commissionHistory` and `commissionHistoryNote`. All 14 `/web/*` modules return 200. `GET /sites/no-such-property` still answers 404 with CSP `default-src 'none'; ... form-action 'self'`, and `/server/store.js` remains 404.

**Not verified from outside, and why.** `/server/store.js` is not served (404), so the `property_create` permission, the `noPropertyYet` shape, the receipt handling and the `starterInventory` audit field are **inferred from the deployment restart**, not read from outside: on the host, `grep -c property_create /opt/jovian-pms-test/current/server/store.js`, `grep -c starterInventory /opt/jovian-pms-test/current/server/store.js` and `grep -c noPropertyYet /opt/jovian-pms-test/current/server/store.js` should all be non-zero. The page is served under `/web/` and was read from outside; its behaviour is covered by the in-process DOM script, not by a browser on the live service.

Still not done: a property is created with a name and a code only — no address, time zone, tax registration, logo, currency or notice-letter identity, so those still come from whatever the demonstration data carried. There is no way to delete or rename a property, and no import: pasting a listing link and having the rooms typed in for me is **not** built, and nothing here scrapes a platform. `seed()` still creates the demonstration properties; only newly created ones are empty. Real channel settlement, payments and door access remain unconnected.

## Anyone can sign up and try one empty store of their own (2026-11-04)

The operator asked for a version of the system that anybody can try, open to the outside world, where a store is created by the person who owns it. The clarifying answers were: open registration usable immediately, strict isolation (each trial sees only its own store), deploy on the existing test service first, and basic anti-abuse without a third-party captcha. This batch delivers exactly that, without touching the existing staff accounts or the demonstration stores.

- **The signup page is public, script-free and three-language.** `GET /signup` serves an ordinary HTML form (username, password typed twice, store name, store code, and a hidden honeypot field) under the same CSP as the public property site: `default-src 'none'`, no script, `form-action 'self'`, `noindex`. The page says plainly that trial data lives on a test service and real guest data must not be entered. Its text lives inside `pms/server/http.js` on purpose: the release installer only refreshes files the host already has, so a new runtime file would never deploy. `POST /signup` takes the form without a session, answers by redirect (post/redirect/get, so reloading never signs up twice), and on success lands the new owner on `/web/?signup=<name>&store=<code>`, where the login dialog names the account and the store code in all three languages.
- **One account, one empty store, nothing invented.** `Store.signup()` in `pms/server/store.js` validates the username (`/^[a-zA-Z0-9._-]{3,64}$/`), the password (12–256 characters), the store code (`/^[a-zA-Z0-9_-]{2,40}$/`) and the name (1–80), refuses a taken username with `username_taken` and a taken store code with `property_exists`, and writes the user (role `admin`, `active`, scrypt-hashed like every other account), the property body at `revision 0` with every collection empty and `businessDate:null`, the grant, and one append-only `property_create` audit row carrying `starterInventory:'empty'` and `origin:'trial'`. The store starts exactly as empty as one created by a staff administrator: the layout is the owner's to type.
- **The trial origin is a fence, not a label.** A guarded `ALTER TABLE users ADD COLUMN origin TEXT NOT NULL DEFAULT 'staff'` widens the existing table (no rebuild; older databases read `staff` everywhere). `createProperty()` refuses an actor whose origin is `trial`, so a trial account cannot grow a second store even though the command is hidden from its page too. A member invited by a trial administrator inherits that origin, so inviting an "admin" is not a loophole around the limit. The cap is global: past `Store.trialStoreCap` (500) signups answer `signup_closed` with 403, protecting the shared test database from being filled by a loop. A staff administrator is untouched: the existing `property_create` tests still pass unchanged.
- **Isolation is the ordinary authorization path.** A trial account's `user_properties` contains exactly its own store, so `authorize()`, `visibleMembers()` and every scoping check work unchanged: a trial never reads another trial's or a staff store's data, and commands aimed at another property are refused with `forbidden`. The DOM verification drives the refused command through the real HTTP API with a real session and CSRF token and asserts the store count never changes.
- **Anti-abuse is the same pattern the public site already uses.** Per-IP rate limit of five counted attempts per fifteen minutes (the success, the honeypot fill and the mismatched-password redirect all count), a filled honeypot answered like the rate limit so the page never reveals which check decided it, and the password mismatch bounces back with `signupError=password_mismatch` and the typed fields preserved. No third-party captcha, no email verification — the system has no mail channel, and faking one would be a lie.
- No new runtime file was added: the served half is confined to existing `pms/server/store.js`, `pms/server/http.js`, `pms/web/app.js` and `pms/web/catalog-ui.js` (the create-property panel is hidden for a trial origin; the server refuses the command anyway).

Tests: Node **402** (was 397). A new `pms/test/trial-signup.test.js` adds five cases: a stranger signing up and receiving one account plus one genuinely empty store with the audit row, a trial being unable to create a second store with an invited member inheriting the limit while ordinary room-type work still succeeds, every validation and duplicate plus the trial cap with staff administrators unaffected, one trial never reading or writing another trial or a staff store, and the real HTTP route working end to end with the honeypot, the mismatch and the per-IP window refusing the sixth attempt without writing. A new `verification/dom-trial-signup.mjs` drives the public page over real in-process HTTP: it fetches the script-free page, posts the plain form, signs the trial in through the workspace, lands on the settings view with nothing in it, checks the create panel is absent, fires the refused `property_create` with a real session and CSRF token, and confirms exactly one store is in scope. All **18 DOM scripts**, Python **5/5**, all **37** runtime JS syntax checks and all deployment shell syntax checks pass.

**Verified on the live service after this push (2026-11-04).** `/healthz` returns 200 with `{"ok":true,"service":"jovian-pms","data":"test-only"}`. `GET /signup` returns 200 with CSP `default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'` and `X-Robots-Tag: noindex`, containing the username, store and honeypot fields and zero `<script>` tags. `web/app.js` carries `signupDone`, `signupDoneStore` and `window.__pmsUserOrigin`; `web/catalog-ui.js` carries `__pmsUserOrigin`. `/api/signup` does not exist (403; signup is the plain-form route), and `/server/store.js` remains 404.

**Not verified from outside, and why.** `/server/store.js` is not served (404), so `Store.signup()`, the `origin` column migration, the trial refusal inside `createProperty()`, the member-origin inheritance and the 500-account cap are **inferred from the deployment restart**, not read from outside: on the host, `grep -c "origin='trial'" /opt/jovian-pms-test/current/server/store.js`, `grep -c signup_closed /opt/jovian-pms-test/current/server/store.js` and `grep -c renderSignupPage /opt/jovian-pms-test/current/server/http.js` should all be non-zero. The page itself was read from outside; a real signup was **not** performed against the live service, deliberately — the trial accounts that exist on the test database are the ones this batch's tests created in memory, and writing a throwaway account into the shared online database without being asked is exactly the kind of side effect the project refuses.

Still not done: a trial has no way to convert itself into a paying deployment — there is no billing, no plan, no export, and no staff handover path beyond the team page it already has. The trial store is on the shared test database, with no per-tenant quota beyond the global account cap, no storage limits and no deletion of an abandoned trial. The signup page has no email verification (no mail channel exists), no real captcha, and the rate limit is per restart of the process. Real payments, OTA settlement and door access remain unconnected.

## Roles a property defines for itself: the Account Role model, ticked action by action (2026-11-07)

The operator asked for the reference product's permission model to be carried over exactly: roles are defined per property, an operator ticks what each role may do, and accounts take a role or carry a few extra permissions on top. What could honestly be carried over is the **mechanism** — the Account Role page's model of module-by-module ticks, batch assignment and extra grants — because no source code of the reference product exists to copy and its action list was never observed in detail; the server's action catalogue is the one this codebase already enforces, and it is now offered in full on the page that edits it, so nothing a role can hold is invisible to the person granting it.

- **A role is a list of actions, nothing implied.** `role_definitions` stores one row per property: a name, and the exact actions ticked for it. `permissionsFor(user, propertyId)` is now the single source of what an account may do in one property: the role it holds there (a built-in or a property-defined one), plus any single actions granted in `member_permissions`. A custom role carries no hidden subsystem defaults; `actionsForRole()` returns only what was ticked, and an action that is not in the enforced catalogue cannot be written into a role at all. Roles are audited in `member_audit` (`role_save`/`role_delete` with the action list before and after) and answered through the same receipts as every other command.
- **The built-in four keep the access they always had.** `admin/operations/finance/viewer` resolve exactly as before; the operator's existing accounts change nothing. What did change is that the ticket desk, guest messages and self check-in now ask for the **action** (`support_reply`, `guest_send`, `sc_review`…) instead of the account's role name, so a property can staff those desks with a defined role without handing out an administrator account.
- **Extra permissions never climb past the giver.** `member_permission_save` refuses an action the actor does not hold in that property, so an extra grant can widen a colleague's desk but not the granter's own reach. The grant **replaces** the previous set (the same semantics as the reference page), so an accumulation of old grants cannot linger invisibly.
- **The shared account row stays with account administrators.** A property-defined role holding `member_save` can hand out roles inside its own property — that is the point of the model — but the account's system role, password, active flag and property scope are written only by account-level administrators, keeping the existing guard against a property-level override rewriting the team.
- **The page shows the whole grantable surface.** The team page draws the matrix module by module (13 modules, three languages), lists the built-ins with their plain-language descriptions, edits a custom role in a details block, and refuses to delete a role somebody still holds (`role_in_use`), explaining why. Members are handed a custom role from the same property-role dropdown as before. New error codes surface in the three languages: `role_input`, `role_name_taken`, `role_in_use`, `role_limit` (50 per property).
- No new runtime file: the server half lives in the existing `pms/server/store.js` and the desk modules (`support.js`, `guest-messages.js`, `self-checkin.js`); the served half lives in `web/workspace-ui.js`, `web/app.js` and `web/workspace.css`.

**Follow-up (`da81383`).** The first cut shipped `member_permission_save` tested but with no page entry. Each member scoped to the property now has a details block on the team page pre-ticked with the extra actions actually stored for them (`read()` carries `extraPermissions` per member), and saving posts the whole set — replace semantics, the same flow as the reference product's extra permissions.

Tests: Node **408** (was 402). A new `pms/test/role-permissions.test.js` adds six cases: the catalogue check (every enforced action sits in exactly one module and the matrix covers them all — the page can never drift from the server), a role carrying exactly its ticks with validation and the duplicate-name refusal, a member doing the ticked actions and nothing else (including the property-role/account-role boundary), the in-use deletion guard with audit rows, extra grants riding on top of a role but never above the giver, and the built-in roles unchanged. A new `verification/dom-role-permissions.mjs` drives the page end to end: it asserts the rendered matrix equals the enforced action list, creates a role by ticking two actions and confirms the server stored exactly those, assigns it to a member, tries the deletion (refused while the member holds it), signs the member in, and checks the session's `allowedActionsByProperty` equals the ticks. All **19 DOM** scripts, Python **5/5** pass.

**Carried over, and what deliberately was not.** The mechanism — property-defined roles, module ticks, extra grants, batch assignment through the member row — is the reference product's model. The reference product's own action names, module list and help screenshots were **not** copied: they were never observed first-hand beyond the public help page, and this codebase's action catalogue already maps one-to-one to what the server enforces. When the finance work (statement closing, bank reconciliation, difference posting) is built, its actions join the same catalogue and the same matrix, which is the practical payoff of this batch.


## 子账单拆账与结账冲销（2026-11-07）

补充：订单详情的账单页增加「按消费明细拆账」。同一住宿项的房费合计、每笔非零附加消费和折扣可分到 2–20 张子账单，逐张预览金额。已收款仍手动分配，押金保持独立。服务端从当前账页重算，拒绝漏选、重复或未知明细、空账单及负额子账单，保留分配快照和原拆账权限。原金额拆账继续可用。此为 JOVIAN 实现，SmartOrder 的逐项拆账界面和接口仍未实见。

现有住宿账页支持按自定义项目或付款人标签拆成 2–20 张子账单。费用和已收款分别与原账页守恒，后续住宿收退款必须指向未结账子账单。押金继续按住宿项单独核算。全部子账单结账后住宿项才显示已结账，订单列表可显示部分结账。撤销保留原收付，追加含原结账 ID、操作者、时间和原因的记录。全部子账单开启后才可撤销拆账。活跃拆账期间拒绝改期、改价及取消；退房拒绝相互抵消的子账单差额。

新动作 settle_split、settle_bill、settle_undo、settle_unsplit 已加入共享权限目录、finance/admin 及三语界面。使用既有事务、revision、幂等回执和追加审计。现阶段按住宿项分账，项目与付款人用人工标签和金额分配，未做按消费明细自动划分或跨住宿项合并。SmartOrder 权限来自已入库实见目录。字段与枚举未独立复验，本实现使用 JOVIAN 自身契约。

本机 Windows Node 410 项 408 通过，余下两项为已知私有文件权限用例。修复旧试用注册测试在关闭 SQLite 前重复删除临时目录的问题，保留业务断言。Python 5/5，DOM 20/20，含 dom-folio-split.mjs。


## AR 应收账户与核销（2026-11-07）

- 按门店管理应收账户，从住宿账页或子账单转入当前未收金额。需初始化营业日、已到离店日或已取消、押金已结清。转入减少宾客欠款但不增加住宿现金或收入，经理日报按营业日列出转入与冲销。
- 核销按到期日 FIFO，也可手工分配一笔收款至多笔应收。核销金额与分配守恒，重复、跨账户、超额或旧 revision 拒绝。撤销核销追加引用原记录的事件，现金核销及纠错纳入交班现金，其他方式仅计 AR 收款。
- 支持将未被核销的整笔应收转移到同店另一账户，或退回原账页。已分配的应收必须先冲销分配。冲销为账务记录，不执行支付退款。
- 动作 ar_report_view、ar_account_save、ar_post、ar_write_off、ar_undo_write_off、ar_transfer、ar_undo_post 已加入三处权限目录。内置 finance/admin 可操作，operations 无新增资金权限。读权限按门店隔离。
- 参考证据：SmartOrder 权限目录实见，writeOff 路径来自既有交接，完整字段未复验。本批字段与状态属于 JOVIAN。AR 八张完整报表及月结冻结另批实现。

本机验证：Node 414 项，412 通过，2 项既有 Windows 私有文件权限失败。Python 5/5，DOM 21/21（经理日报格式回归修正后复验）。本批支持独立 AR 收款明细和交班现金口径，月结冻结、账龄与其余专用报表仍待开发。

## 应收与财务八张报表（2026-11-07）

统计 → 应收与财务报表。按已有 ar_report_view 和门店范围读取账龄、账户余额、挂账、核销分配、核销流水、AR 调账、宾客账结余和权责制营业八种视图。默认月初至门店营业日，筛选含首尾。账龄按期末到期日，账户余额从期间前与期间内事件重放，核销冲销单列负数。调账限现有 AR 转移与撤销挂账。宾客账结余和权责制报表复用现有订单计价、营业日与押金口径，未定营业日费用单列提示。

证据：参考产品报表名称见已入库权限目录（历史实见），本批字段、账龄区间与日期口径是 JOVIAN 设计。客户端契约及参考产品算法未独立验证。自然月是默认查询范围，暂未实现月结冻结与专用调账分录。本批无新增业务命令或后端专用路由。

本机 Node 415 项，413 通过，2 项既有 Windows 私有文件权限差异。Python 5/5。新增历史截点测试，扩展 dom-ar-ledger.mjs 覆盖 8 张报表和核销冲销。

## AR 月结与期末快照（2026-11-07）

「统计 → 应收与财务报表 → AR 月结记录」保存每个账户的期初、期间净变动、期末以及门店合计，附关账人、时间和审计 ID。管理员默认有 ar_close_month；查看沿用 ar_report_view 和门店隔离。首次可选择已结束月份，较早余额进入期初；后续必须连续按月关闭。营业日必须已越过该月月末，拒绝重复或跳月。用原有事务、revision 和幂等回执。已关闭日期拒绝应收资金操作，之后的核销或冲销留在当期，不重写已存快照。暂无重开月结。

快照沿用 AR 事件重放，属于 JOVIAN 设计；SmartOrder 月结字段与算法仍未独立复验。冻结范围是 AR，未冻结住宿收入或渠道佣金账期，也未增加独立调账分录。

本机 Node 417 项 415 通过，2 项既有 Windows 私有文件权限差异。Python 5/5。DOM 月结覆盖当前月拒绝、夜审跨月、重新加载后保存和查看期末快照。

## 独立 AR 调账分录（2026-11-07）

「统计 → 应收账款 → 新增应收调账」。加记创建有到期日的独立应收；减记抵减同账户指定开放应收，不超出余额。两者都要求原因，按当前门店营业日入账。调账不会生成现金收款、退款、押金或住宿收入。冲销追加反向金额并引用原分录，原分录保持不变。独立加记如已核销或抵减，须先冲销占用；独立加记当前不支持直接转移账户。

新增 ar_adjust、ar_undo_adjust，沿用 ar_report_view 读取门槛。finance/admin 默认可操作；门店和账户范围、revision、幂等回执与 AR 月结保护沿用原有控制。调账明细展示金额方向、操作人、原因和引用，账龄及余额重放同时纳入原分录和冲销；已存月结快照保持原值。

SmartOrder 权限目录是历史实见；具体分录结构及自动差异规则是 JOVIAN 设计，未独立复验参考接口。本批使用人工分录，渠道佣金账期冻结待后续。

验收见 test/ar-ledger.test.js 及 verification/dom-ar-ledger.mjs，包含关账后加记、减记、冲销、当期报表和旧月快照校验。

本机 Node 418 项 416 通过，2 项既有 Windows 权限差异。Python 5/5，DOM 21/21。

## 渠道佣金月结与账期冻结（2026-11-07）

「统计 → 佣金明细 → 佣金月结记录」。新佣金以首次记录的门店营业月份归期，无已初始化营业日时使用马来西亚记录月份。旧数据以现有记录时点推导月份，不能推断更早的首录时间。更正保留已有归期。原明细仍按到店日期筛选，并显示佣金归属月份；月结面板以佣金归属月份独立汇总。

管理员默认可执行 commission_close_month，finance 可查看。须先过月末，拒绝未结发票、缺失归期、重复和不连续关账。首期不可跳过更早已有录入的月份。快照保存渠道金额、笔数、发票引用和结算时间，冻结佣金更正和相关测试订单清理。新录入的迟到发票记入当前营业月份。月结不会计算或自动划拨佣金，只汇总人工录入且已标结算的数据；无重开月结功能。

新动作走既有门店权限、revision、幂等和审计，三处目录已登记。SmartOrder 细节未独立复验，归期和关账约束是 JOVIAN 口径。未连接 OTA 账单或银行接口。

本机 Node 420 项 418 通过，两项已知 Windows 私有文件权限差异。Python 5/5。新增测试覆盖跨月归期、未结拦截、冻结后拒绝更正及清理，DOM 覆盖活跃月拒绝、夜审跨月、未结拦截和最终快照。

全量 DOM 22/22，含佣金月结。

## 主订单批量结账

同一门店同一主订单有多项住宿时，财务和管理员可从主订单详情一次结账。所有待结账住宿项须分别结清房费和押金，未结清的拆分账单须在各住宿项处理。每项住宿保留原流水并追加带同一批次号的结账记录。仍可按既有权限逐项重开。此为 JOVIAN 工作流，SmartOrder 对应流程未实见，同一主订单的多收款转账已补充，详见下节。

## 主订单合并收款

同一门店的主订单可登记一笔已实际收到的现金、转账或刷卡款，并手动分配给两项或更多未关闭、未拆账且仍有欠款的住宿项。所有分配之和须等于实收，每项不可超过其欠款。原子提交，分项流水保留同一批次号和付款参考。报表金额按分项相加，流水笔数仍按分项统计。押金、退款、拆分账单和转账继续走各自流程。此为 JOVIAN 实现，SmartOrder 对应收款流程尚未实见。

主订单详情可查看合并收款记录，按批次显示原收款总额、方式、参考及各住宿项分配，并可打开对应账页。财务或管理员可按原批次冲销并填写原因。系统追加关联流水并保留原记录，遇到账页关闭、拆账或原收款后已有退款时拒绝整批操作。此操作只登记账务冲销。

## 同一主订单内转移多收款

财务和管理员可从主订单详情把开放账页的已收超额转给同单另一张有欠款的开放账页。要求已设置营业日，保留两条同批记录和原因。只影响住宿账页余额及按日余额报表，原实收、押金和现金报表保持原记录。已有拆账或 AR 流水的账页不能参加，参与后不提供拆账。两张账页均开放且该笔仍为双方最后一笔未撤销转移时，可在转移记录填写原因撤销。系统保留原转移并追加等额反向记录。范围为同一门店的同一主订单。

## 已关闭佣金月结的更正

有佣金录入权限的员工可从佣金月结的原账单行输入更正后总额、凭证号和原因。差额记入当前营业月份，原账单和已关闭快照保留。更正有独立审计和待月结明细，并纳入当前月的渠道汇总。仅登记账务更正。

## 已关闭 AR 月结的更正

统计 → 应收与财务报表 → AR 月结记录，展开已关闭月份，再从对应账户登记借项或贷项。更正按当前营业日入账，保留原快照并关联更正原因、操作人和时间；当前月关账时将更正纳入新快照。贷项限该账户在原账期内产生且仍有余额的项目。AR 更正使用原关账权限。佣金月结更正须同时具备佣金录入及佣金关账权限，财务可查看。日常交易冻结规则保留。

下两项为改期续住计价，以及班次、夜审与报表金额核对。NOBEDS、支付和 TTHotel 仍待正式配置与实测。

已部署提交 `a0e05cb`。Actions 42754425077 测试和部署通过；公网健康检查与两个月结更正入口标识已核对。

## 改期与续住计价

订单详情的「修改 / 续住」按住宿日期保留重叠晚的逐夜价，新增晚用表单的每晚价，缩短时删除取消的未夜审晚。改动每晚价时，重算所有保留及新增的未夜审晚。已夜审晚保留原价，普通编辑不能增加或删除已夜审晚，也不能改变已入账收入的渠道归类。以门店营业日判断冻结，不以收款时戳或自然日代替。原附加费用及原入账日、收退款、押金均保留，待收按新费用重算。房间异动记录显示修改前后应付费用。

续住仍使用现有表单报价口径。价格计划是否自动重报价、附加费是否自动挪到新入住日，缺已核验规则，暂未实现。班次、夜审和报表总额对账留待下批。

运行时 `a2f30ac` 已部署。Actions 42757051292 和公开健康及页面标识检查通过。

## 班次、夜审与金额核对

流水汇总按马来西亚收退款操作自然日，住宿营业、逐夜房费及附加费用按各自营业入账日。押金单列为负债。交班窗口按真实时间点比较，含起点不含终点，仅统计本门店。抽屉应点现金只纳入现金住宿净收付及现金 AR 核销净额，银行卡、转账及押金在各自统计中列示。已存交班、AR 和佣金月结快照保留。

日余额等于期初余额加当日费用，减住宿净收付、转 AR 和该筛选范围内的账页转移净额。转移与撤销是非现金分录。同一批次的合并收款和冲销沿用分项流水加总。房间异动显示改期前后应付，已夜审房费保留原规则。

暂存预订不占库存，不计入住宿费用或费用报表，历史收付款仍进流水。已结账、已拆账、有应收或转移流水的住宿项不能移入。正常关账先在同一事务恢复库存，冲突则整笔拒绝。暂存过期按入住日识别。跨过已夜审日期的暂存恢复或转应收涉及历史费用，保留夜审保护，待业务口径核验。

首页夜审磁贴打开工作台。设置 → 夜审设置管理初始营业日。班次和交班仍在工作台。自动夜审、自动交班、按班次加人员、批量异常处理、历史一键结账和清空夜审记录未实现。手工交易指定时间及独立账项调整缺对应业务入口和数据契约。参考规则来自用户提供的 SmartOrder 只读实见。NOBEDS、支付、TTHotel 仍未配置。

运行时 `ad48dbb` 已部署到测试站。Actions 42789084376 成功，Linux Node 427/427、Python 5/5。公网健康检查、夜审与班次入口、交易与营业报表标识均已核验。交互验证使用合成数据。

## 夜审工作台与按人员交班

首页夜审打开工作台。设置页显示手工模式和初始营业日，支持按班次或按班次加人员。按人员交班使用服务端认定的操作人过滤该时段的住宿和 AR 收付。原有现金口径及快照保留。

工作台将逾期未入住与未退房列为必须处理，暂存过期与历史未结列为排除。处理全部按门店营业日识别异常，以马来西亚自然日判断未入住单的离店日；仅修改住宿状态，记录每项结果，库存不足则跳过，不追加房费或结账。已运行夜审后，普通补录及倒填入住日不能落在已夜审日；原管理员权限及逐夜计价保护保留。自动模式调用遇到必处理异常即拒绝，不允许强制通过。

未完成：自动夜审调度与每天 00:00 自动交班。跨午夜班次的截账、遗漏执行补跑与无人归属的流水缺已核验口径。撤销入住、撤销退房、恢复取消和拖动换房尚无入口。NOBEDS、支付和 TTHotel 未配置。

运行时 `0ccc249` 已部署测试站。Actions 42792436206 成功，Linux Node 429/429、Python 5/5。公网健康检查和夜审工作台、设置、处理全部及交班方式标识已核对。实际交互使用本地合成订单验证。

## 预订引擎设置预览

入口为设置 → 预订引擎 / 生成网页。显示 Booking Engine、Chinese Site、RED、WeChat 的未启用状态，房型与价格计划为空并链接现有维护页，税费为空。SEO 代码尚未设置，仅显示 head 注入说明。划线价显示开启且 1.0 倍未生效。身份核验预览只显示业务联系人、公司名、电话、地址，均为只读。SmartOrder 的 Configure 内部字段和税费维护未实见。无新增写入接口。NOBEDS、支付和 TTHotel 未配置。

运行时 `4d383b8` 已部署测试站。Actions 42793514069 成功，Linux Node 429/429、Python 5/5。公网健康端点、预订引擎、划线价与核验预览标识实见通过。交互验证使用合成数据。

## 暂存箱、锁房和住宿状态撤销（2026-11-10）

- 路径：房态 → 日历 → 暂存箱；当前为仍暂存的已确认住宿项，即使离店日已过也继续显示。历史为曾移入但已移出或取消的住宿项。搜索姓名、电话、预订号；支持入住、离店、房型、渠道筛选。卡片展示移入时间、预订号、操作人。取消打开原取消表单；正常移出在原事务中重新检查并保留库存，可选自动分房。原交易继续计入交易统计，暂存住宿项不计入营收和订单总额。
- 路径：订单详情 → 移入暂存箱 / 锁房复选框 / 适用的撤销或恢复入口。禁止移入已结账、已拆账、有应收或转移流水的住宿项；跨已夜审日的暂存恢复和转应收保持原保护。SmartOrder 只读实见为 Only Blocked；JOVIAN 没有已核验等价状态，沿用现有已确认和财务资格规则，没有创建新状态。
- 锁房只限制房间分配；取消勾选解除限制。日历拖动只能换到同一入住日、另一兼容空房，须确认；不改日期、房费、付款、押金。不提供开门或密码。服务端复用分房校验和库存事务。
- 撤销入住、撤销退房、恢复取消分别沿用入住、退房、取消权限，并保留变更审计。没有夜审修改权限时，按最后实际夜审日拦截；恢复取消取取消操作的马来西亚自然日，无法核对旧取消时间时拦截。撤销不追加收退款或结账，受库存冲突与既有财务关联约束；有非零取消费用的取消单不自动恢复，费用更正口径待核验。暂存后取消的住宿项恢复后仍为暂存，移出另走库存检查。普通补录与逐夜价保护沿用既有逻辑。
- 证据：参考的页面、说明、锁房勾选及夜审限制来自 ISOLA KLCC 只读实见；参考系统取消与移出没有执行。历史归档、取消费用阻断、同日拖动和权限映射是 JOVIAN 的实现边界，未宣称参考系统完全相同。真实门店业务未实测；NOBEDS、支付、TTHotel 未配置。

发布：Actions [42795933551](https://github.com/Popo841103/codex-pan/actions/runs/42795933551) 成功，Ubuntu Node 433/433、Python 5/5。公网 `/healthz` 返回 `ok:true`、`data:test-only`；`/web/app.js` 已验证 `data-reservation-box`、`data-box-tab`、`data-box-cancel`、`data-box-restore`、`toggle-lock`、`data-stay-reversal`、`data-stay-drag`、`confirm-room-drag`；`/web/workspace-ui.js` 的预订引擎与夜审工作台标识仍在。


## 前台工具与显示规则审计补全（2026-11-10）

基线运行时 `e69f4a4`（Actions [42798753554](https://github.com/Popo841103/codex-pan/actions/runs/42798753554) 成功）已逐项审计。本批运行时 `c57d73f4589ec030e9a8466300d37b7652f9d4e8`，Actions [42825710371](https://github.com/Popo841103/codex-pan/actions/runs/42825710371) 的 Verify PMS 与 Deploy 均成功。逐项表见 `pms/verification/front-desk-audit.md`：原批次 1、3、6–11 完成，2、4、5 为文案部分完成，本批补齐；11 项在本次要求边界内均完成。

- **入口**：房态 → 日历 → 房态日志 / 智能锁列表 / 批量打印；住宿项详情底部 → 计划任务 / 打印中心 / 自助入住预览；设置 → 房态显示与前台住宿规则（也可从日历 → 显示设置进入）。分组用于日历筛选，显示设置可选择按房型、房间、分组排列。
- **规则**：房态日志仅查询，房号、操作日期、动作、操作人筛选与八列完整，保留关房/开房/置净/置脏/停用快照，不修改旧日志。操作日期按马来西亚自然日，关房起止按原库存日期；不拿营业日替代。未记录历史字段留空。智能锁 Private Door/Common Door 均可空，支持搜索输入，明确未开通；计划任务仅 All 空列表。打印中心仅两个页签和基础设置提示；批量打印仅过滤计数；自助入住仅外观且生成/确认禁用。三语独立 No Data 替换误导的创建订单提示，英文标题补全 Print Center。
- **规则**：管理员创建/改名分组并拖入房间；房型、房间、分组拖动排序影响对应日历显示。付款方式与既有渠道默认全部启用，可拖动排序/停用，账页与新预订使用保存后的选项。仅既有渠道枚举，不宣称连接 OTA。预发房卡默认关闭、分钟禁用且 0；开启接受整数 0–1440 分钟（相对入住时间），关闭归零。只保存门店设置，不实际发卡，不是智能锁密码。共享后端沿用授权及同一 reducer，双状态机一致性由合成测试覆盖。
- **验证**：Linux 本地 Node 24 `npm test --prefix pms` 439/439，Python 5/5；Ubuntu Actions 同为 Node 439/439、Python 5/5。25 个 DOM 脚本及 folio 的两种参数分支，共 27/27；38 个运行时 JS 语法及 CI 三个部署 shell 语法通过。增强 `dom-front-desk-tools.mjs` 覆盖所有工具只读、不增加 revision/audit、三种日历行序、分组创建/改名、选项停用/排序、房卡开关与订单/资金记录不变；新增两项 Node 测试覆盖共享/本地设置与五类日志快照一致及旧历史不变。
- **证据等级**：上述交互为本地进程内 jsdom + 内存 SQLite + 合成账号/订单验证，不是线上登录浏览器验收。公网 GET `/healthz` 200 返回 `{"ok":true,"service":"jovian-pms","data":"test-only"}`；GET 静态 JS 的新标识实见。后端 `/server/` 不公开，运行时行为依据源码、合成服务测试及发布重启推断，未取得主机佐证或供应商联调证据。
- **线上标识**：`/web/app.js` 命中 `referenceNoData`、`Print Center`、`data-room-status-logs`、`data-smart-lock`、`data-batch-print`、`data-registration-count`、`data-scheduled-task`、`data-print-center`、`data-self-checkin-preview`、`roomTypeOrder`、`groupOrder`；`/web/workspace-ui.js` 命中 `data-operations-display`、`data-layout-list`、`data-group-name`、`advanceEnabled`、`advanceMinutes`、`no key card is issued`；`/web/reservation-ui.js` 命中 `sourceOptions`；公开 `/src/demo-store.js` 命中 `saveDisplayPreferences`、`advanceCard`、`roomStatusRows`，`/src/inventory-actions.js` 命中 `export function roomStatusRows`。全部 17 个 web JS 与 app.js 的 21 个实际直接导入模块均通过 GET 200 检查。
- **刻意未做**：打印、模板设置内部、生成/复制/发送自助代码或链接、任务类型/自动发送、门锁设置字段/购买/远程开门/密码、真实发卡、NOBEDS/支付/TTHotel；未操作真实订单、资金或门锁，未修改线上账号或重置数据。日历 Overview/Reserve/Combined Room/Share、自动夜审/00:00 交班/跨午夜截账/补跑、无人归属流水、清空夜审、历史批量夜审/一键结账、计划自动重报价、附加费自动移日、Booking Engine Configure/税费/跟踪代码/倍率编辑/身份提交继续不做。跨夜审暂存恢复与 AR 保护保留。没有改部署工作流或新增运行时模块。


## 内部运营 A1–A9 批次（2026-11-10）

- **版本**：基线运行时 `c57d73f`、文档 `f0f12c1`；本批运行时 `40df39059a0e0de2ce056bd7fcb31a04cac49b81`，Actions [42836859905](https://github.com/Popo841103/codex-pan/actions/runs/42836859905)。部署结论与GET结果见 `continuity/VERIFICATION.md` 本批节；逐项规则与边界见 `pms/verification/internal-operations-audit.md`。
- **A1入口/规则**：设置→提醒，班次/账号升级规则、员工提醒/可搜索历史、本人原因撤回、活动日期报表。设置账户管理员专属；作用域同门店、最新同作用域规则生效且只升级。班次按马来西亚自然时钟匹配，活动按明确营业日，不混口径。原文/撤回分开保留、追加审计；指定接收账号只向本人/发送人展示，管理员可查门店历史。无短信/邮件/push。
- **A2/A3入口/规则**：统计→佣金明细，默认渠道费率（百分比/生效营业日/追加历史）、首次账单预期/实际/差额（分）、佣金月结快照与当前开放期更正。预期以首次录入的账页应付总额（含附加费/取消费）作为人工参考，保存费率和基数，后续改费率不重算旧单，缺费率不猜。关闭月份禁止费率补写与原账修改；账户管理员勾确认后再次确认具体月份，月结保存原预期快照。旧更正无营业日显示未分配计数，不拿月份首日补日期；无OTA结算导入或银行对账。
- **A4入口/规则**：设置→房型与房间，最多10个公开URL逐行读取，核对标题/人数/照片URL/描述/当前门店后管理员逐行确认，才保存可编辑房型草稿。缺字段留空；来源快照保留，不自动建销售库存或发布。HTTPS、DNS地址校验并固定连接、私网/保留网段/IPv6拒绝、无Cookie/脚本/跳转、5秒/1MB、robots失败关闭。所有测试用本地注入fixture，没有对真实平台抓取或绕过授权。
- **A5入口/规则**：设置→门店网页或房型与房间，照片URL顺序/封面、每物理房zh/en/ms描述，前后内容快照。公开 `/sites/<slug>?from=...&to=...&guests=...` 查询结果显示，只有存在且发布的站点允许HTTPS图片（no-referrer，文本转义，无脚本）；空路由CSP保留。一个请求可含多个房型，共1–8间，每间人数及日期区间一致；报价快照、查询/撤回仍是一份，人工接受原子生成多个住宿项，无自动确认/支付。
- **A6入口/规则**：既有 `server/self-checkin.js` CLI 支持 `backup-seal` / `backup-rotate` / `backup-restore`。目录AES-256-GCM密封，原密钥域分离派生+随机salt+epoch，验证后删目录原明文文件；轮换可换根密钥/epoch，旧包保留旧密钥可恢复。恢复仅写新目录，不覆盖运行库。合成SQLite backup→密封→轮换→恢复DB+原guest key→解密记录与CLI旧包恢复均通过。**没有自动加密服务器现存备份，没有改发布器/工作流**；离线工具已部署，接入主机运维与原密钥安全保管仍是边界，不宣称线上恢复演练完成。
- **A7入口/边界**：日历底部→当前区间住宿查询（可搜索），住宿详情底部→整单住宿与已有日志；均只读、同门店，不增revision。已有房态日志/批量打印过滤/锁未开通列表/计划任务及打印中心和自助入住空预览保留。指定共享隐藏入口第9节未在本克隆定位，仓库可读研究文档的第9节是自动化，未冒充同一清单；未知条目仍未核验。全部禁止动作不做。
- **A8入口/规则**：佣金明细/提醒页下方日期报表及CSV；渠道按来源汇总账单/更正数、预期/实际/差额/无费率数；提醒按发出/撤回列营业日、人员、接收人、原文及原因。CSV同筛选、UTF8 BOM、引号及公式前缀防护；旧日期/费率不猜。
- **A9验证/证据等级**：本地Linux Node24全套449/449（新增10），Python5/5，25个DOM脚本+两种folio参数分支27/27；37个runtime JS及3个部署shell语法通过。新DOM走进程内真实HTTP+jsdom，涵盖预览不写、逐行确认、内容维护、无脚本公开多房型表单、CSV、A7查询不增revision。双状态机逐命令比对，权限/门店隔离/原文保留/营业日期/佣金冻结及恢复篡改拒绝均有合成测试。Windows原两项权限失败规则未改。
- **刻意未做**：真实订单/资金/生产数据/锁/身份操作、线上账号更改或重置、供应商抓取/结算/银行/短信电邮推送、真实设备联调；日历Overview/Reserve/Combined Room/Share、自动夜审/00:00交班/跨午夜截账/补跑、无人归属流水、清空或历史批量夜审/一键结账、自动重报价/附加费移日、Booking Engine Configure/税费/跟踪代码/倍率/身份提交、购买/开门/密码、NOBEDS/支付/TTHotel继续不做。跨夜审暂存恢复与AR保护保留；未新增runtime文件，未改部署工作流。

发布补证：Actions `42836859905`（job `129901265793`）Verify及Deploy成功，Ubuntu449/449、Python5/5；备份 `update-8Fpq4WBO`。公网GET `/healthz` 200且test-only；三份变更JS与本地SHA256一致，17个web JS和21个直接导入模块全部200；server路径仍404。仅只读资产核验，后端为源码/合成测试/发布重启推断，无线上业务交互验收。



## 全目录对照与内部运营查询续跑（2026-11-11，马来西亚/中国 UTC+8）

基线运行时 `40df390`、文档 `9d94165`；本批运行时 **`7e41bf3a4d1232dcffbd9f50a377930c4edd5719`**。保留并审查上次中断的5个运行时文件和2个测试脚本，补建中文 `pms/verification/parity-matrix.md`，修正目录连续编辑稳定ID、DOM旧选择器、iCal共享空间/关房遗漏；没有回退既有线上功能。

参考目录此次在本机只读获得，**A7“第9节未找到”的历史说明已被本批对照取代**。矩阵逐条列出1–9节114个编号入口，另附8个非编号流程/全局入口；编号统计：**已有32、部分62、缺失5、禁止或需外部接入15**。这是保守的功能差距表，不代表完整同款或供应商接通；参考资料、截图、客人资料与金额均未复制入库。

| 本批推进的21个入口 | JOVIAN入口与实际范围 |
|---|---|
| 2.7–2.9、2.12–2.13 | 统计→运营查询工作台：房价变更快照、每日/未来库存、计划到离清洁日历和当前清洁列表；库存沿用共享原子分配，不把不同产品重复相加，不虚构派工/历史清洁状态。 |
| 3.6–3.7 | 同工作台→iCal：匿名占用文件下载与粘贴全天fixture严格预览；覆盖共享套房/关房，未分房或逾期区间不确定时拒绝导出；没有公开订阅、网络抓取或保存导入。 |
| 4.11、5.2 | 工作台→客户住宿详情/内部账单，或住宿详情底部→内部账单；完整费用/净实收/押金分开，非税务发票，不按同名合并独立住宿记录。 |
| 5.3–5.5 | 客户→内部目录：标签组、标签、公司目录/已有AR引用；追加版本和标签绑定/解绑历史，没有公司储值或自动挂账。 |
| 6.1–6.6 | 工作台→营收、交易、渠道、销售（预订类型/公司）、住宿汇总及备忘录历史，13个查询均可搜索并导出同筛选CSV。备注历史从本版本起，旧记录不补日期；不是独立财务快记账。 |
| 7.3、7.5–7.6 | 客户 / 设置→房型与房间 / 工作台→内部目录：钟点房、餐食、物品定义与价格（MYR分）；钟点定义不创建小时库存，餐食不产生权益/核销，旧住宿不重报价。 |

三语zh/en/ms；目录修改和标签维护由服务端强制账号admin，门店/父项/整数金额/小时范围校验；本地及SQLite走同一reducer，保留追加审计与原版本。营收、销售、备注按记录营业日，交易按马来西亚自然日；押金独列。内部账单完整展示住宿快照，不冒充区间会计账单。CSV采用同一结果、UTF8 BOM、引号/换行转义及公式前缀防护。所有查询/预览不增加revision/audit。

**验证和发布：** Linux本地Node24 **463/463**（基线449，新增14），Python **5/5**；26个DOM脚本及folio `--lines`/`--amend`分支共 **28/28**；37个运行时JS与3个部署shell语法、`git diff --check`通过。新脚本覆盖六目录连续版本编辑、客户标签、13个查询/CSV、三语、离线ICS、账单及切店无旧结果。Node覆盖门店隔离、管理员限制、双状态一致、日期口径、共享空间、严格ICS、CSV和查询纯读。先前DOM旧按钮选择器失败已修正，完整重跑28/28。Ubuntu门禁未弱化，Windows既有私有文件权限规则未改。

`gh run watch 42851378626 --exit-status --interval 5` 返回成功；Actions [42851378626](https://github.com/Popo841103/codex-pan/actions/runs/42851378626)，job `129952661926`，Verify和Deploy均成功，2026-11-10 16:07:57 UTC完成（本地11月11日00:07:57）。CI同样Node463/463、Python5/5。发布器原有备份 `update-vxBcjMlu`；不代表已自动加密。

**剩余缺口（下一优先）**：2.10/2.11餐食权益及可撤销核销、4.13统一失败预订列表、2.8/2.9库存全部分项/筛选、6.8–6.12交班/经理/账簿/权责经营/客账报表完整维度、7.25/9.21节假日、7.26清洁检查项；独立客户档案、按小时预订、公司储值、真实iCal同步及已核验汇率/渠道倍率仍未完成。矩阵保留“部分/缺失”，未以简化查询宣称完整财务系统。

**边界**：没有重置数据、修改既有账号/数据库或真实订单/资金/门锁，没有新增运行时文件或修改发布工作流。用户全部Do NOT项继续不做；特别是日历Overview/Reserve/Combined Room/Share，自动夜审/00:00交班/跨午夜截账/补跑、无人归属流水、清空/历史批量夜审或一键结账、自动重报价/移附加费、Booking Engine Configure内部、税费/跟踪代码/划线倍率/身份提交、锁购买/远开/密码、NOBEDS/支付/TTHotel。跨夜审暂存恢复及AR保护保留并通过既有回归。

公网GET、证据等级及复现详见continuity/VERIFICATION.md本批章节。


## 餐食、库存、清洁与营业日报表续跑（2026-11-11，UTC+8）

基线运行时 `7e41bf3`、文档 `f0a4796`；本批运行时 **`03d67f677ac7835db1f39e7ab9a5046010037823`**，已推送 `jovian-pms-test` 并实际部署。Actions [42855630092](https://github.com/Popo841103/codex-pan/actions/runs/42855630092)，job `129967754962`，Verify与Deploy成功；`gh run watch 42855630092 --exit-status --interval 5`退出0。2026-11-10 16:33:35 UTC完成（本地11月11日00:33:35）。发布器原有备份 `update-b18ZFksR`，不代表自动加密。

矩阵114条：**已有48、部分51、缺失0、禁止或需外部接入15**。本批16条从部分/缺失提升为已有：**2.7–2.13、4.13、6.7、6.11–6.12、7.5、7.25–7.26、9.10、9.21**。已有指明确列出的JOVIAN内部能力，不代表供应商全部字段或接入。

| 入口 | 本批实现与边界 |
|---|---|
| 客户 / 设置→房型与房间 / 统计→运营查询工作台下方 | 餐食分类、计价单位、单价、启停追加版本；管理员分配使用日权益、运营核销、管理员带原因撤销。快照保留，超量/重复撤销/跨门店/取消或暂存住宿拒绝；核销按马来西亚使用日，不自动收费或重报价。 |
| 工作台→餐食明细/汇总、失败及未完成预订 | 使用日权益/已核销/剩余与CSV；人工内部失败记录加现有网站拒绝/撤回等请求统一查询/状态/渠道/CSV，无OTA失败推送、自动重试或供应商字段假造。 |
| 工作台→每日/未来库存 | 全分项、房型/渠道占用过滤、31日纵向或横向矩阵及同结果CSV；共享套房竞争在房型过滤后仍保留。渠道不分摊门店容量，各房型共享选择不能相加，干净/脏房只是当前快照。 |
| 工作台→房价及可售变更历史 | 同时过滤受影响日、操作日、房型、计划、人员和实际变化项目；原批次及before/after保留。 |
| 目录→清洁检查项；工作台→清洁列表/日历/检查记录 | 管理员检查项启停/改名/关联房型；完整适用检查表逐项保存名称快照、结果、备注、人员、时间；人工任务指派/进行/完成/取消，负责人限有效本门店账号；检查/任务不自动改房态，不生成历史状态。 |
| 目录→节假日与活动；工作台→节假日历 | 日期、名称、类型、热度、显示追加版本；逐日日历、列表、搜索、CSV。仅人工内部假日，无未经核验国家节假日或官方订阅。 |
| 工作台→交班/经理/账簿/权责经营/客账余额 | 五类新增营业日查询和CSV；新交易记录权威营业日并另列马来西亚交易日，旧缺日期不倒填。权责借贷及押金负债分开，期间与截至结束日所在月累计；客账期初+费用−净收款−AR−账单转入=期末，押金独列，仅涵盖已知日期账项。原自然日现金流与经理公式页保留。 |

**仍保留部分的业务报表**：6.8/6.9虽新增收银汇总/明细、接待分页、交班窗口/操作员/方式/渠道筛选和CSV，房卡明确未接通；接待仅可读最近500条审计，新日志记录营业日，不追造历史。班次仅筛选已完成交班窗口内有时间戳的操作，房晚不凭空分班。6.10新增营业日统一明细及当前整单住宿账簿快照，但仍缺完整创建/完成时间过滤及全部业务分类。没有储值、外部会计、房卡供应商集成。

**验证**：本地Linux Node24 **490/490**（新增27），Python **5/5**；27个DOM脚本加folio `--lines`/`--amend`共 **29/29**；37个运行时JS、4个部署shell语法及`git diff --check`通过。Ubuntu Actions同样Node490/490、Python5/5。新Node逐命令比对双状态机、权限/门店隔离/幂等/原记录保留、共享套房/逾期/矩阵、两种日期口径及财务公式；新DOM在本地真实HTTP+jsdom+合成账号/内存SQLite操作完整新增链。首轮旧internal-operations DOM等待内容入库后抢先导航，已明确等待新form替换，完整29分支重跑全过；没有放松业务busy guard或Ubuntu门禁。Windows既有私有文件权限规则未改。

**后续优先**：独立客户档案、6.1–6.6统计完整维度及有住宿归属的快记账、6.10创建/完成日期账簿过滤、小时预订；之后再评估明确授权范围内iCal持久导入。房卡/储值/OTA失败推送及真实外部会计不冒充接通。全部Do NOT项继续不做，跨夜审暂存恢复、AR、资金/押金分离等原保护保留。

本批未重置数据、修改既有账号/数据库或操作真实订单/资金/门锁；SmartOrder仅本机只读入口资料参考，无个人数据/截图复制。新增运行逻辑并入5个既有runtime文件，未新增部署runtime文件、未改发布工作流。详见 `pms/verification/operations-completion-audit.md` 和 `pms/verification/parity-matrix.md`。


## 独立客户、统计维度与账簿续跑（2026-11-11，UTC+8）

基线运行时`03d67f6`、文档`1e9924c`。本批功能提交 **`96ff297d72b6afc6cb5fc112389d4f9efbfc266e`**；随后以 **`5b407329efb13e0036d065dc6231a97e873efb80`** 修正旧流水`at:null`误变Unix纪元日期的边界，明确列为日期未分配。两次均已推送`jovian-pms-test`并实际部署，不回退原有功能或数据。

最终Actions [42859317901](https://github.com/Popo841103/codex-pan/actions/runs/42859317901)，job`129980844356`，Verify和Deploy成功；`gh run watch 42859317901 --exit-status --interval 5`退出0。2026-11-10 16:54:47 UTC完成（马来西亚/本地11月11日00:54:47）。Ubuntu Node **534/534**、Python **5/5**。前次Actions`42859098210`/job`129980067044`也成功（Node533/533）。最终发布器原有备份`update-N3V2AIwp`，不代表自动加密。

矩阵共114条：**已有63、部分36、缺失0、禁止或需外部接入15**，本批15条由部分提升：**4.11、4.14–4.15、5.1–5.2、6.1–6.6、6.10、7.6、7.11–7.12**。已有仅表示矩阵明确列出的JOVIAN内部能力，不代表供应商全部字段或外部服务。

| 已完成行 | 入口与实际范围 |
|---|---|
| 5.1–5.2 | 客户/设置→内部目录→独立客户档案；客户档案与有归属业务。独立编号、允许同名、新建/修改/停用追加版本，联系方式/生日/证件末四位选填，管理员明确绑定/解绑住宿及原因。不自动合并，不改住宿快照；待收/待退/押金独列。 |
| 6.1–6.5 | 统计→运营查询工作台→营收/交易/渠道/销售/住宿汇总。前四类双维度及房型/渠道/已记录计划/状态/账项类型/创建完成日期过滤，住宿五维度和共享容量，搜索/CSV同结果。营收按费用营业日，交易按马来西亚自然日；房晚与小时费用分开，渠道/细分条件不虚构容量归属。 |
| 6.6、7.11 | 目录→快记账分类；客户档案与有归属业务→有住宿归属快记账；工作台→快记账/备忘录历史。管理员方向/启停追加版本，运营收退款必须选住宿及原因，类别快照保留，沿用余额/关闭/拆账/AR/暂存保护。不做无人归属收支或非住宿支出。 |
| 6.10 | 工作台→统一账簿记录。营业日费用/四类收退款/AR/账单转账、完整住宿快照；新增创建与实际退房的马来西亚日期起止过滤、时间/创建人/状态。完成时间从本版显式退房记录，撤销退房清空当前时间；旧记录不倒填，不以计划离店冒充完成。 |
| 4.14–4.15 | 工作台→收退款流水明细/交易汇总。住宿归属、人员/方式/渠道/房型/参考号/备注、自然日与另列营业日，搜索/分类/CSV；四类流水和押金独列，混合明细无误导性金额合计。 |
| 4.11、7.12 | 目录→内部账单模板；住宿详情→内部账单，或工作台→内部账单。纯文字标题/页脚/启停管理员版本，完整费用及押金独立快照、CSV和专用打印样式；非税务发票，不维护税费、不注入代码、不提交外部票据。 |
| 7.6 | 目录→物品；客户档案与有归属业务→物品费用。确认住宿/数量/原因后按保存时名称和单价快照写入当前营业日；改目录不重算旧费用，无自动物品库存。 |

**小时预订已推进，但7.3继续部分**：目录→钟点定义后，在“客户档案与有归属业务→小时预订（整日保留库存）”创建指定资源订单；工作台→小时预订查询/CSV，详情显示使用日/起止时间。整点、整数小时、不跨午夜；价格为最低时长基础价加向上取整额外单位，保存定义快照。使用日整日保留库存，复用现有共享原子及SQLite claims，实际退房后释放；同日办理入住、付清且押金清零才退房标脏。拒绝已夜审日、逾期在住共享资源和普通改期重报价。尚无精细小时段分配、预定同日多次周转或自动周转，不为完成指标改成已有。

**6.8/6.9继续部分**：从本版起完整追加接待事件，与旧可读audit去重；旧日志仅最近500条可读记录、不追造。交班仅筛选人工已完成窗口，不把房晚凭空分班，房卡仍未接通。

**回归**：本地Linux Node24 **534/534**（新增44）、Python **5/5**；28个DOM脚本加folio`--lines`/`--amend`共 **30/30**；37个runtime JS和6个shell语法、`git diff --check`通过。新增Node覆盖独立客户同名隔离/显式绑定/追加版本、财务保护、统计勾稽与日期口径、旧空时间、小时冲突和夜审，并逐命令比对本地reducer与SQLite的orders/directory/completion/reception状态、权限/隔店/幂等。新DOM通过本地HTTP+jsdom+合成账号/内存SQLite运行完整业务链、三语、CSV、切店清空及查询不写审计；打印为window.print桩验证，未声称真实打印机或线上写业务验收。旧DOM选择器报表数由23更新为27。Windows既有私有权限规则和Ubuntu门禁均未弱化。

新增运行逻辑并入6个既有runtime文件，新增test/verification文件不参与运行时安装；无新runtime依赖/模块/数据表，未改发布工作流或claims结构。没有修改既有账号/真实订单/资金/门锁或重置数据库；SmartOrder只用已有只读观察作流程参考，未复制未核验字段或客人资料。全部Do NOT继续不做，既有夜审、暂存恢复、AR、账单关闭与押金保护保留。

**下一优先**：小时库存精细时间窗与人工周转；明确授权边界内iCal持久导入；公司目录非储值内部能力；首页/前台仍为部分的内部设置。真实房卡/OTA/支付/锁及外部会计不冒充接通。逐行范围和复现见`pms/verification/parity-matrix.md`、`pms/verification/customer-statistics-audit.md`。

### 最终版本公网只读GET证据

检查时间：`2026-11-10T16:55:07.090843+00:00`。

- GET `/healthz` 200，精确返回`{"ok":true,"service":"jovian-pms","data":"test-only"}`。
- GET `/web/app.js` 200，逐字节与本地一致；SHA256 `27c15cb18402d4043821cf91ffc06b8c77ad4de14f3c041c039f0ff209f4f66c`；标识`data-completion-command`、`data-hourly-stay`、`invoice-print`全部命中。
- GET `/web/workspace-ui.js` 200，逐字节与本地一致；SHA256 `322f366852fb7367b5a2038825ab4875e5458d7e0e66c5c132d9016f85ca9a46`；标识`completionPanel`、`createdFrom`、`customerProfiles`全部命中。
- GET `/src/demo-store.js` 200，逐字节与本地一致；SHA256 `79bf167f25d97b958c216add3e5e25709c65c43e3191f085b5fc8d4c065d106a`；标识`completionActions`、`customerLinks`、`whole_day_hold`、`completedAt`全部命中。
- GET `/src/financial-reports.js` 200，逐字节与本地一致；SHA256 `a86b2250b4fbe87af052ec71fb7d81cd1540af31141cde80b35aedb2c5b770ef`；标识`transactionDetail`、`dimension2`、`customerProfiles`、`t.at?localDay(t.at):''`全部命中。
- GET `/web/style.css` 200，逐字节与本地一致；SHA256 `53c1ef90cff874216585716df90b968530310366c985f9ddd517e14430365426`；标识`body.invoice-print`全部命中。
- 全部web JS与app直接导入模块合并去重，GET **26/26** 为200；`/server/store.js`为404，不公开后端源码。
- 公网仅GET健康和资产，未登录或写入线上业务。后端依据源码、合成SQLite回归与成功部署重启，未取得主机执行或供应商联调证据；不把前端哈希匹配当作后端运行直接证明。
