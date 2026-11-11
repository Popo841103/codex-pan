# Batch 10 front desk walkthrough and JOVIAN rose branding

2026-11-11. Branch `jovian-pms-test`; baseline `071182a`. Existing workflow, accounts and data preserved. All writes used isolated synthetic memory SQLite; deployed verification is GET-only. No real orders, funds, production data or door locks were operated. No new runtime files or dependencies. New reducer rules run through the shared backend's existing `apply()` transaction; durable server snapshots also include room segments.

## A–K acceptance

| Letter | Result | Delivered behavior and evidence |
| --- | --- | --- |
| A | Fixed | An unset store has a prominent home-page one-click opening-date prompt prefilled with Malaysia today (Asia/Kuala_Lumpur). Administrator confirms once; no automatic night audit or existing-date reset. Walkthrough DOM confirms prompt, value and persisted date before posting. |
| B | Fixed | Checkout review has an actual date independent of the workspace test date. Explicit keep-total or consumed-nights choice for early departure; preserve total by adding removed room charges to the final billed night. Same-day overnight departure has a disclosed minimum one-night billing period and immediately releases inventory. Recompute requires any refund first; no money is moved automatically. Folio/deposit and audited-night protections remain. Header shows operation date, business date and Malaysia today separately. |
| C | Fixed | Normal New Order offers hourly mode, saved price definition, assigned human-named room, Malaysia usage day/start hour/duration, phone and MYR quote. Details show hours and hourly charge, calendar shows separate labeled partial markers, catalogue money input converts MYR to cents only at the API boundary. Check-in before the window warns and requires confirmation; denial leaves status unchanged. Hourly kind contributes to room revenue, not extras. Existing whole-hour/no-cross-midnight bounds remain. |
| D | Fixed | Resource options use human room names; internal IDs remain option values. Walkthrough DOM verifies normal hourly options have no generated unit IDs. |
| E | Fixed | Calendar counts are explicitly sellable **rooms / beds / suites** (their actual meaning), not mislabeled as arrival/maintenance counts; existing tooltip retained. |
| F | Fixed | Ignore repeat action clicks while a save is running and clear a stale busy message when it finishes. DOM double-click cleaning verifies the saved clean state and no stuck saving label. |
| G | Fixed | Manager report separates recognized revenue, receipts, prepayment credit and deposits; negative balance is explained as potentially future-stay prepayment, not expense or cash loss. New payments retain persisted business-date attribution; Malaysia cash-day reports remain separate. Legacy undated history is not invented/backfilled. Pending arrival/departure counts exclude completed/cancelled guests, and current in-house is scoped to the selected stay day (not a reconstructed historical census). HTTP checks shift rows, no new unallocated transactions, and balanced manager dates. |
| H | Partially fixed | Chosen-night move preserves earlier room segments, assigns later nights, keeps one folio/transactions, checks inventory atomically and records segments in both audit paths. Calendar and nightly room reports use dated segments. Conservative limits: grouped-bed partial moves are refused; date amendment after segmentation is refused; an in-house future move must be performed on its operating day rather than silently scheduling cleaning/physical movement. Confirmed reservations may have future segments. Whole-stay moves and existing self-check-in approval invalidation continue to work. |
| I | Fixed | One nonempty Chinese, English or Malay name is enough; other names fall back to it. All-empty names still fail server validation. Node and actual DOM room-type creation cover the rule. |
| J | Fixed | Successful reservation closes without automatically opening a parent dialog. Parent remains available from queues/order list. Clear receivable/refund wording, distinct “房态显示设置” sidebar text and visible calendar New Order button. DOM regression updated to assert closure and then navigate normally. |
| K | Fixed | Optional MYR default rate at room-type creation atomically creates/links an independent plan. New order preselects the plan and price; server quote uses its default when no daily override exists. Explicit daily closed/rate overrides win; existing saved stay prices never auto-requote. Node and DOM validate MYR123.45 prefilling. |

Conservative B rule is an explicit product decision, not a claim that an unobserved SmartOrder billing rule was verified. H limitations preserve audit, grouping and cleaning guarantees instead of inventing automatic future physical room moves. Reference was the supplied read-only `/workspace/smartorder-audit/01-menu-inventory.md`; no SmartOrder writes or unverified field copying.

## Reconciliation

`test/http-business-flow.test.js`: signup → opening date → one-name/default-rate type → rooms → three-night reservation/check-in → MYR300 prepayment → MYR50 deposit in/out → MYR50 items → dated room move → keep-total early checkout → two-hour MYR15 reservation/payment/checkout → shift.

- Folios, revenue, cash-day receipts and handover: **MYR365**; due/deposit zero; all claims released and used rooms dirty.
- Opening business day recognizes MYR115 room/hourly + MYR50 extras versus MYR365 receipts; **MYR−200** prepayment balance is reconciled.
- Following billed night recognizes retained MYR200; closing balance zero; removed future night earns nothing.
- All new payments carry the chosen business date; shift detail has no unallocated transactions. Cash remains on the distinct Malaysia transaction day.
- Node covers both early price choices, refund-first requirement, same-day minimum, closed-night protection, dated segments and future in-house move rejection.

## Pink rebrand

Single shared rose palette in `web/style.css`: primary `#d6336c`, hover `#b02a5b`, link `#a92154`, tint `#fce4ec`, focus `#92234e`. Existing workspace CSS consumes variables; public server-rendered pages read those same tokens from the existing stylesheet. HTML/manifest theme metadata necessarily uses the matching literal. No new runtime asset path is required.

105 blue-family literals replaced with rose/plum variables, including pale surfaces, chart/slot accents and borders. Round Georgia “J” monogram, matching regenerated PWA icons, warm canvas, rounded cards and rose sidebar distinguish JOVIAN. Legacy stored `blue` order-color code is displayed as Rose; its persisted value remains compatible. Semantic green/orange/red status cues remain. Text contrast tests cover white primary/hover, links and tabs, selected surfaces, muted labels and focus: all tested pairs ≥4.5:1. Grep and a hue-based regression prohibit old blue accent literals across public source and inline server markup.

Real local Chromium found the formerly unstyled staff context occupying the header flex row and intercepting navigation. Context now sits in a narrow strip below the header, prioritizing the test operation date; real pointer-click navigation passes. No forced-click workaround.

## Verification and timeout

Final local Node24 **599/599**, Python **5/5**, runtime JS/shell syntax and diff checks pass. 32 `dom-*.mjs` plus communications and two folio branches = **35 scenarios**. The full first DOM loop passed 32/33 scripts but hit its 35-second cap on the large workflow. The workflow passed on isolated retry and again with the requested **`timeout 300s`**, exit0; no reproducible rebrand failure established. Final focused desk DOM and folio branches pass. Do not describe the earlier capped run as all-green.

Commands:

```
npm test --prefix pms
python3 -m unittest discover -s pms/test -p 'test_*.py' -v
timeout 300s node pms/verification/dom-workflows.mjs /tmp/pms-verification-deps/node_modules/jsdom/lib/api.js
node pms/verification/dom-front-desk-walkthrough.mjs /tmp/pms-verification-deps/node_modules/jsdom/lib/api.js
node pms/verification/browser-brand.mjs /tmp/jovian-pms-shots-data/node_modules/playwright/index.mjs
```

Real Chromium acceptance verifies computed primary/hover/white text, selected navigation, round monogram, theme and desktop/mobile screenshots (`/tmp/jovian-pink-desktop.png`, `/tmp/jovian-pink-mobile.png`). This is real local browser evidence, not live business acceptance. `/server/` remains private. Deployment run IDs and public hash evidence are recorded in the continuity update and `batch10-pink-live.json` after deployment.
