#!/bin/sh
# ORDER 338 — spelartyperna (mentorn, rimlig; 40 frön) med vinbaren och bistron i Flygeln, bistron i hela flygeln.
# Skriver reports/order338/flygeln/glashornet-trappa-<spelare>.json. Jämförelsen: node scripts/order338-jamforelse.mjs.
#
#   [SEEDS=40] sh scripts/order338-flygeln.sh
cd "$(dirname "$0")/.."
SEEDS=${SEEDS:-40}
OUT=order338/flygeln
mkdir -p reports/$OUT
printf 'glashornet-trappa-mentorn mentorn\nglashornet-trappa-rimlig rimlig\n' | xargs -P 2 -L 1 sh -c "KARNAN_PREMISES=glashornet KARNAN_AW=0 KARNAN_SEEDS=$SEEDS WRITE_REPORTS=1 REPORT_ORDER=$OUT KARNAN_PLAYERS=\$1 KARNAN_OUT=\$0.json npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts > reports/$OUT/\$0.log 2>&1; echo \"\$0 \$?\""
echo KLART
