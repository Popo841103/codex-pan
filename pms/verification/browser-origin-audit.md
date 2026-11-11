# Batch 09: real browser Origin regression (2026-11-11)

The earlier synthetic HTTP tests supplied `Origin` explicitly and missed Chromium's native form behavior under `Referrer-Policy: no-referrer`. Actual Chromium 156 reproduced `Origin: null` and HTTP 403 when a no-referrer meta policy was applied to signup. Reloading the corrected page submitted the native form with the real origin and received 303; the account existed in the isolated in-memory SQLite store.

## Fix and security boundary

The shared response header is now `Referrer-Policy: same-origin`, including errors, redirects, assets and public pages. Recovery and self-checkin had overriding no-referrer meta policies and now use same-origin too. External photo elements retain their resource-specific no-referrer setting; this does not change the document's form policy. Same-origin keeps referrers within this service and sends none externally. Missing, opaque `null`, mismatched origins and Sec-Fetch-Site cross-site remain refused. Staff POSTs still require their session CSRF token. No origin exception was introduced.

## Endpoint and form audit

All non-GET requests pass the same host/origin gate before dispatch. Public signup, booking request and manage (lookup/withdraw) accept only URL-encoded form bodies. Signup and request use relative 303 Post/Redirect/Get locations; manage returns HTML 200 without putting the contact in a URL. Public GET availability/search forms need no Origin. Public CSP form-action self permits their same-origin actions. No absolute/off-origin form actions were found.

JSON-only POST routes: login, account-recovery; self-checkin lookup/register/access (bearer authorization after lookup); authenticated guest-messages/commands, checkin-admin/commands, support/commands, listing-preview and commands. These use JSON parsers and clients set application/json. Logout intentionally has no parsed body and requires session CSRF. Unsupported methods reach no mutating handler. Staff forms in index.html and app/calendar/catalog/checkin-admin/communication/financial/reservation/workspace UI modules use preventDefault handlers and existing Backend JSON commands, or read-only local queries. Recovery and self-checkin forms likewise prevent native submission and send JSON. No additional content-type, CSP or redirect correction was needed. Sensitive recovery tokens remain fragment-only and are removed from the URL before requests; fragments never enter referrers.

## Reproduction and validation

- `node --test pms/test/browser-origin.test.js`: correct origin accepted by signup/request/manage/JSON login; null+same-origin, missing, mismatched cross-site and correct origin+cross-site all rejected before writes. Redirect targets remain relative.
- `node pms/verification/browser-origin.mjs /path/to/playwright/index.mjs` (CHROME_PATH optional): local-only real Chromium, in-memory database. Reproduces old failure using a temporary document meta policy, then native signup 303, public request 303, lookup 200, withdrawal 200; JSON login from staff/recovery/self-checkin documents 200. Captured all eight POSTs: first null, remaining seven actual origin and Sec-Fetch-Site same-origin. No synthetic Origin injection.
- Local Node 24: 587/587; Python release tests 5/5; deployment shell syntax and git diff checks passed. Existing self-checkin header assertion updated to the intended policy, security assertions retained.

No deployed account, order, financial record, database, lock, external provider or workflow was modified by verification. State-machine business rules are unchanged in both reducers. Public verification is read-only; deployment evidence will be appended after Actions completes.
