#!/bin/sh
# ORDER 333 D och B — spelartyperna (stark, mitten, svag; 40 frön) med lokalen fast per rad (KARNAN_PREMISES, från
# övertagandet av vinbaren) och med vagnen på Magasinsgatan (KARNAN_TRUCK_SPOT), som platserna i ORDER 332 H.
# Skriver reports/order333/lokaler/<lokal>-<rad>.json och reports/order333/lokaler/magasinsgatan-<rad>.json.
# Jämförelsen: node scripts/order333-jamforelse.mjs.
#
#   [SEEDS=40] [JOBS=6] sh scripts/order333-lokaler.sh
cd "$(dirname "$0")/.."
SEEDS=${SEEDS:-40}
JOBS=${JOBS:-6}
OUT=order333/lokaler
mkdir -p reports/$OUT
JOBSFILE=$(mktemp)
for p in torget kallaren salongen glashornet; do
  printf 'premises %s trappa-mentorn mentorn\npremises %s trappa-rimlig rimlig\npremises %s trappa-slarvig slarvig\n' $p $p $p >> "$JOBSFILE"
done
printf 'spot magasinsgatan trappa-mentorn mentorn\nspot magasinsgatan trappa-rimlig rimlig\nspot magasinsgatan trappa-slarvig slarvig\n' >> "$JOBSFILE"
export SEEDS OUT
cat "$JOBSFILE" | xargs -P "$JOBS" -L 1 sh -c 'kind=$0; at=$1; name=$2; player=$3; if [ "$kind" = premises ]; then export KARNAN_PREMISES=$at; else export KARNAN_TRUCK_SPOT=$at; fi; KARNAN_SEEDS=$SEEDS WRITE_REPORTS=1 REPORT_ORDER=$OUT KARNAN_PLAYERS=$player KARNAN_OUT=$at-$name.json npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts > reports/$OUT/$at-$name.log 2>&1; echo "$at-$name $?"'
rm -f "$JOBSFILE"
echo KLART
