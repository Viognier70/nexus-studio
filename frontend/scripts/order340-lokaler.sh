#!/bin/sh
# ORDER 340 E — spelartyperna per lokal (Torget, källaren, källaren med AW, salongen, Flygeln), alla eller PLAYERS.
# Alla tar över vinbaren vecka TAKEOVER (förvalt 2; KARNAN_TAKEOVER_WEEK), så att också de som annars aldrig når den
# mäts i lokalerna. Skriver reports/<OUT>/<lokal>-<spelare>.json. Jämförelsen: node scripts/order340-jamforelse.mjs.
#
#   [SEEDS=40] [JOBS=10] [TAKEOVER=2] [OUT=order340/lokaler] [PLAYERS="mentorn rimlig ..."] [VARIANT='{...}'] [ROWS="torget:0:torget"] sh scripts/order340-lokaler.sh
cd "$(dirname "$0")/.."
SEEDS=${SEEDS:-40}
JOBS=${JOBS:-10}
OUT=${OUT:-order340/lokaler}
TAKEOVER=${TAKEOVER:-2}
VARIANT=${VARIANT:-'{}'}
PLAYERS=${PLAYERS:-"mentorn klok per stjarna rimlig halva halvbra slarvig enkel bistro soigne ignorerar ignorerarUtbildad forsiktig lasare mentornVinbar"}
# ROWS: lokal:AW:radnamn, förvalt alla fem raderna.
ROWS=${ROWS:-"torget:0:torget kallaren:0:kallaren kallaren:1:kallaren-aw salongen:0:salongen glashornet:0:glashornet"}
mkdir -p reports/$OUT
JOBSFILE=$(mktemp)
for p in $PLAYERS; do
  for row in $ROWS; do
    set -- $(echo "$row" | tr : " ")
    echo "$1 $2 $3-$p $p" >> "$JOBSFILE"
  done
done
export SEEDS OUT TAKEOVER VARIANT
cat "$JOBSFILE" | xargs -P "$JOBS" -L 1 sh -c 'KARNAN_VARIANT="$VARIANT" KARNAN_TAKEOVER_WEEK=$TAKEOVER KARNAN_PREMISES=$0 KARNAN_AW=$1 KARNAN_SEEDS=$SEEDS WRITE_REPORTS=1 REPORT_ORDER=$OUT KARNAN_PLAYERS=$3 KARNAN_OUT=$2.json npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts > reports/$OUT/$2.log 2>&1; echo "$2 $?"'
rm -f "$JOBSFILE"
echo KLART
