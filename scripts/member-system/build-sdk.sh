#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
npm ci --no-audit --no-fund
./node_modules/.bin/esbuild sdk-entry.js --bundle --format=iife --global-name=CohubSupabase --platform=browser --target=es2020 --minify --legal-comments=inline --outfile=../../member-sdk.js
python3 - <<'PYSDK'
from pathlib import Path
p=Path('../../member-sdk.js')
p.write_text('/*! Supabase JS 2.99.1\n'+Path('LICENSE-supabase.txt').read_text()+'\n*/\n'+p.read_text())
PYSDK
