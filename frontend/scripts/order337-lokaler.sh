#!/bin/sh
# ORDER 337 D — spelartyperna (mentorn, rimlig; 40 frön) med vinbaren och bistron i varje lokal (bistrons planer per lokal; D15:s antal
# platser), källaren med och utan AW, och vagnen på Magasinsgatan (stamgästerna: taket 20 vid vagnen och tålamodet i kön, ORDER 337 B), som scripts/order334-lokaler.sh. Skriver reports/<OUT>/<rad>.json.
# Jämförelsen: node scripts/order337-jamforelse.mjs.
#
#   [SEEDS=40] [JOBS=10] [OUT=order337/lokaler] sh scripts/order337-lokaler.sh
cd "$(dirname "$0")/.."
SEEDS=${SEEDS:-40}
JOBS=${JOBS:-10}
OUT=${OUT:-order337/lokaler}
mkdir -p reports/$OUT
JOBSFILE=$(mktemp)
cat > "$JOBSFILE" <<ROWS
kallaren 0 kallaren-trappa-mentorn mentorn
kallaren 0 kallaren-trappa-rimlig rimlig
kallaren 1 kallaren-aw-trappa-mentorn mentorn
kallaren 1 kallaren-aw-trappa-rimlig rimlig
salongen 0 salongen-trappa-mentorn mentorn
salongen 0 salongen-trappa-rimlig rimlig
glashornet 0 glashornet-trappa-mentorn mentorn
glashornet 0 glashornet-trappa-rimlig rimlig
spot:magasinsgatan 0 magasinsgatan-trappa-mentorn mentorn
spot:magasinsgatan 0 magasinsgatan-trappa-rimlig rimlig
ROWS
export SEEDS OUT
cat "$JOBSFILE" | xargs -P "$JOBS" -L 1 sh -c 'case $0 in spot:*) export KARNAN_TRUCK_SPOT=${0#spot:};; *) export KARNAN_PREMISES=$0;; esac; KARNAN_AW=$1 KARNAN_SEEDS=$SEEDS WRITE_REPORTS=1 REPORT_ORDER=$OUT KARNAN_PLAYERS=$3 KARNAN_OUT=$2.json npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts > reports/$OUT/$2.log 2>&1; echo "$2 $?"'
rm -f "$JOBSFILE"
echo KLART
