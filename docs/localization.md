# CO-HUB built-in website languages

## Runtime
English, Simplified Chinese and Malay retain the maintained native page data. Sixteen additional languages use prewritten `locale-<code>.json` files at the website root. `languages.js` loads only same-origin JSON, remembers the language and applies fixed translations to static and dynamic content. No external Google translation page or service is used. Arabic uses right-to-left layout. Official product names and contact identifiers may remain in their original spelling.

Personal form input, dates, prices, IDs and cart links are not passed through translation. Enquiry messages translate predefined labels while preserving user entries. Selecting a language does not send a message or create a reservation.

## Maintaining copy
Edit each language JSON when changing English source text. Run `python3 scripts/i18n/check-locales.py`, `python3 tests/community-browser.py` and `python3 tests/native-languages-browser.py` with the local server on port 8000. The latter requires Playwright and Chromium. The lightweight coverage check also runs in GitHub Actions. Locale-only changes trigger the website workflow.

`data-en` values are source keys. Preserve numeric specifications, prices, addresses, phone numbers and brand spelling. Update the resource version in scripts/build-community.py and the locale fetch version in languages.js when a release needs cache invalidation. Runtime JSON is the deployable source of truth; do not regenerate it silently from a model.

## Translation provenance and limits
The additional-language drafts were prepared offline using the MIT-licensed M2M100 418M conversion at `michaelfeil/ct2fast-m2m100_418M`, pinned revision `06bd83294674f3737eb929e501aa5beafaa229d8`. Downloaded model.bin and sentencepiece assets were checked against their Hugging Face LFS SHA-256 metadata. No model or translation service runs on the website or the Vultr server. Model weights and temporary tools are not in the repository or deployment archive.

Core navigation, enquiry/cart labels, opening status, shared bathrooms, ordering/collection/payment instructions, check-in/out and important coffee text were revised explicitly. Traditional Chinese was converted from the maintained Chinese source with OpenCC and supplemented for shared dynamic labels. Initial drafts contained repetition and terminology errors; detected repetition was corrected before release. This does not constitute full professional native-speaker review of every long beer description. Continue editorial review from customer and staff feedback rather than claiming all linguistic details are final.

## Verification
The local browser check covers eight pages, sixteen additional languages and three viewport widths, RTL, language persistence, coffee cart amounts and WhatsApp links, and unchanged personal form entries. The existing three-language regression and seven deployment tests also pass. A separate check requires all fixed website phrases to exist in every extra language pack. These are functional checks, not a guarantee of translation quality.
