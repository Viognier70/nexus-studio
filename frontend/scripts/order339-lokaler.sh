#!/bin/sh
# ORDER 339 D — spelartyperna (mentorn, rimlig) per lokal med storleken i ekonomin (taket, hyran, laget, det tomma
# rummet), källaren också med AW. Skriver reports/<OUT>/<rad>.json. Jämförelsen: node scripts/order339-jamforelse.mjs.
#
#   [SEEDS=40] [JOBS=10] [OUT=order339/lokaler] [RADER="..."] sh scripts/order339-lokaler.sh
cd "$(dirname "$0")/.."
SEEDS=${SEEDS:-40}
JOBS=${JOBS:-10}
OUT=${OUT:-order339/lokaler}
mkdir -p reports/$OUT
JOBSFILE=$(mktemp)
cat > "$JOBSFILE" <<ROWS
torget 0 torget-trappa-mentorn mentorn
torget 0 torget-trappa-rimlig rimlig
kallaren 0 kallaren-trappa-mentorn mentorn
kallaren 0 kallaren-trappa-rimlig rimlig
kallaren 1 kallaren-aw-trappa-mentorn mentorn
kallaren 1 kallaren-aw-trappa-rimlig rimlig
salongen 0 salongen-trappa-mentorn mentorn
salongen 0 salongen-trappa-rimlig rimlig
glashornet 0 glashornet-trappa-mentorn mentorn
glashornet 0 glashornet-trappa-rimlig rimlig
ROWS
export SEEDS OUT
cat "$JOBSFILE" | xargs -P "$JOBS" -L 1 sh -c 'KARNAN_PREMISES=$0 KARNAN_AW=$1 KARNAN_SEEDS=$SEEDS WRITE_REPORTS=1 REPORT_ORDER=$OUT KARNAN_PLAYERS=$3 KARNAN_OUT=$2.json npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts > reports/$OUT/$2.log 2>&1; echo "$2 $?"'
rm -f "$JOBSFILE"
echo KLART
