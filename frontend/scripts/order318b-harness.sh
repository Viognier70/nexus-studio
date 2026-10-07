#!/bin/sh
# ORDER 318b — samma tabell som ORDER 315a och 318, efter Anders beslut om hållbarheten (F66) (samma körningar som
# ORDER 314, plus spelartypen "försiktig"; med tiderna till stegen, fältet ladder).
# Varje rad kör order296Karnan.test.ts med KARNAN_SEEDS säsonger och skriver
# reports/order318b/efter40/<namn>.json. Parallellt, JOBS åt gången.
#
#   [SEEDS=40] [JOBS=8] sh scripts/order318b-harness.sh
cd "$(dirname "$0")/.."
SEEDS=${SEEDS:-40}
JOBS=${JOBS:-8}
OUT=order318b/efter40
cat > /tmp/order318b-jobs.$$ <<JOBS_EOF
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
cat /tmp/order318b-jobs.$$ | xargs -P "$JOBS" -L 1 sh -c 'name=$0; player=$1; skill=$2; if [ "$skill" = "-" ]; then skillEnv=""; else skillEnv="ROCKET_SKILL=$skill"; fi; env $skillEnv KARNAN_SEEDS=$SEEDS WRITE_REPORTS=1 REPORT_ORDER=$OUT KARNAN_PLAYERS=$player KARNAN_OUT=$name.json npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts > reports/$OUT/$name.log 2>&1; echo "$name $?"'
rm -f /tmp/order318b-jobs.$$
echo KLART
