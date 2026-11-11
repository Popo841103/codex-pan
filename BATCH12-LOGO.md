# Batch 12 — official JOVIAN HOME logo

Branding only; no business rules, database/accounts, state-machine changes or workflow edits. Rose remains #d6336c. Original supplied JPG is unchanged: SHA256 `aa2a2921b8d00a8a4a796b75e682913f0cb2496d0947fa50f8ce7d6695c8f55a`.

Deterministic Pillow crops from the 1279×1279 source: emblem box (458,282,828,645), full artwork box (128,278,1160,1028). Preserve RGB artwork and white background; Lanczos proportional resizing only, no drawing/recoloring. Full artwork is 900×654 PNG. Ordinary icons use 90% width; maskable uses 76% width (the complete circular emblem fits Android's central 80% safe circle). PNG sizes 192 and 512. Source pixels include the original subtle edge colors; no thresholding or recoloring.

Header uses icon-512.png; header lockup/login/recovery/checkin/signup/property public page use logo.png, alt text JOVIAN HOME. Offline embeds the same full PNG so it survives loss of connectivity. Existing service worker cache version advances to refresh offline artwork; no private data caching added. Manifest continues pointing to the three replaced existing icon files. Favicon is the emblem PNG. Old monogram generator removed from browser-brand.mjs; UI grep for monogram, >J</ and fillText('J') has no matches.

Publisher compatibility: logo.png is kept in web for review, while existing server/http.js serves an identical embedded derivative at /web/logo.png. No new runtime module is required or imported. Icon assets replace existing files. /server remains private.

Local verification: Node24 603/603; Python5/5; runtime/browser JS syntax and git diff --check pass. Updated browser-brand.mjs passes in Chromium with isolated synthetic SQLite, checks header/login image paths, alt and decoded dimensions, rose primary/hover/navigation/theme and desktop/mobile screenshots. New official-logo HTTP test checks full-logo bytes, favicon MIME/bytes and private server refusal. Read-only browser-official-logo.mjs checks live header/login assets, four local/live PNG hashes, favicon and offline embedded-logo rendering. Screenshots under /tmp are local evidence, not committed guest/business data.

Deployment/live results will be appended after the release. No live login, POST or business operations are used.
