#!/bin/sh
# ORDER 334 A och B — spelartyperna (stark = mentorn, mitten = rimlig; 40 frön) med vinbaren i källaren, med och utan
# AW (KARNAN_AW=1), och vagnen på Magasinsgatan och Prästgatan (KARNAN_TRUCK_SPOT), som scripts/order333-lokaler.sh.
# Skriver reports/<OUT>/<rad>.json. Jämförelsen: node scripts/order334-jamforelse.mjs.
#
#   [SEEDS=40] [JOBS=6] [OUT=order334/lokaler] sh scripts/order334-lokaler.sh
cd "$(dirname "$0")/.."
SEEDS=${SEEDS:-40}
JOBS=${JOBS:-6}
OUT=${OUT:-order334/lokaler}
mkdir -p reports/$OUT
JOBSFILE=$(mktemp)
cat > "$JOBSFILE" <<ROWS
premises kallaren 0 kallaren-trappa-mentorn mentorn
premises kallaren 0 kallaren-trappa-rimlig rimlig
premises kallaren 1 kallaren-aw-trappa-mentorn mentorn
premises kallaren 1 kallaren-aw-trappa-rimlig rimlig
premises torget 0 torget-trappa-mentorn mentorn
premises torget 0 torget-trappa-rimlig rimlig
spot magasinsgatan 0 magasinsgatan-trappa-mentorn mentorn
spot magasinsgatan 0 magasinsgatan-trappa-rimlig rimlig
spot prastgatan 0 prastgatan-trappa-rimlig rimlig
ROWS
export SEEDS OUT
cat "$JOBSFILE" | xargs -P "$JOBS" -L 1 sh -c 'kind=$0; at=$1; aw=$2; name=$3; player=$4; if [ "$kind" = premises ]; then export KARNAN_PREMISES=$at; else export KARNAN_TRUCK_SPOT=$at; fi; KARNAN_AW=$aw KARNAN_SEEDS=$SEEDS WRITE_REPORTS=1 REPORT_ORDER=$OUT KARNAN_PLAYERS=$player KARNAN_OUT=$name.json npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts > reports/$OUT/$name.log 2>&1; echo "$name $?"'
rm -f "$JOBSFILE"
echo KLART
