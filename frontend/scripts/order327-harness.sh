#!/bin/sh
# ORDER 327 C — samma 17 rader som ORDER 326 (och 320), körda två gånger på main 272327c9: med 306c (vinbarens
# data som på main) och utan 306c (vinbar.meta.json och vinbar.text.*.json från 9020fa65, före ORDER 326). Inget annat skiljer.
# Varje rad kör order296Karnan.test.ts med KARNAN_SEEDS säsonger och skriver
# reports/$OUT/<namn>.json (OUT=order327/med306c eller order327/utan306c). Parallellt, JOBS åt gången.
#
#   OUT=order327/med306c [SEEDS=40] [JOBS=6] sh scripts/order327-harness.sh
cd "$(dirname "$0")/.."
SEEDS=${SEEDS:-40}
JOBS=${JOBS:-6}
OUT=${OUT:?OUT saknas}
cat > /tmp/order327-jobs.$$ <<JOBS_EOF
trappa-mentorn mentorn -
trappa-klok klok -
trappa-rimlig rimlig -
trappa-halva halva -
trappa-halvbra halvbra -
trappa-slarvig slarvig -
trappa-ignorerar ignorerar -
trappa-ignorerarUtbildad ignorerarUtbildad -
trappa-forsiktig forsiktig 0.85
koncept-enkel-0.85 enkel 0.85
koncept-enkel-0.6 enkel 0.6
koncept-bistro-0.85 bistro 0.85
koncept-soigne-0.85 soigne 0.85
koncept-soigne-0.6 soigne 0.6
stjarna-0.85 stjarna 0.85
stjarna-0.75 stjarna 0.75
stjarna-0.6 stjarna 0.6
JOBS_EOF
mkdir -p reports/$OUT
export SEEDS OUT
cat /tmp/order327-jobs.$$ | xargs -P "$JOBS" -L 1 sh -c 'name=$0; player=$1; skill=$2; if [ "$skill" = "-" ]; then skillEnv=""; else skillEnv="ROCKET_SKILL=$skill"; fi; env $skillEnv KARNAN_SEEDS=$SEEDS WRITE_REPORTS=1 REPORT_ORDER=$OUT KARNAN_PLAYERS=$player KARNAN_OUT=$name.json npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts > reports/$OUT/$name.log 2>&1; echo "$name $?"'
rm -f /tmp/order327-jobs.$$
echo KLART
