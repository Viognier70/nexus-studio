#!/bin/sh
# ORDER 332 H — vagnens intäkt per plats och kvarter: tre spelartyper (stark, mitten, svag) med vagnen på var och en
# av de fem platserna hela foodtruck-perioden (KARNAN_TRUCK_SPOT, order296Karnan.test.ts truckBySpot).
# Skriver reports/order332/platser/<plats>-<rad>.json. Jämförelsen: node scripts/order332-jamforelse.mjs.
#
#   [SEEDS=40] [JOBS=6] sh scripts/order332-platser.sh
cd "$(dirname "$0")/.."
SEEDS=${SEEDS:-40}
JOBS=${JOBS:-6}
OUT=order332/platser
mkdir -p reports/$OUT
JOBSFILE=$(mktemp)
for spot in torget prastgatan gastgivaregarden campus sjon; do
  printf '%s trappa-mentorn mentorn -\n%s trappa-rimlig rimlig -\n%s trappa-slarvig slarvig -\n' $spot $spot $spot >> "$JOBSFILE"
done
export SEEDS OUT
cat "$JOBSFILE" | xargs -P "$JOBS" -L 1 sh -c 'spot=$0; name=$1; player=$2; KARNAN_TRUCK_SPOT=$spot KARNAN_SEEDS=$SEEDS WRITE_REPORTS=1 REPORT_ORDER=$OUT KARNAN_PLAYERS=$player KARNAN_OUT=$spot-$name.json npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts > reports/$OUT/$spot-$name.log 2>&1; echo "$spot-$name $?"'
rm -f "$JOBSFILE"
echo KLART
