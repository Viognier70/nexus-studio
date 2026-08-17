// ORDER 113 §2.3 — figur-komponent, portad från prototypens `Guest`
// (rad 87-149 i guest-reel.jsx).
//
// ORDER 114 §3.2/3.3 utökning — accepterar nu arketyp + ansiktsuttryck
// + hudton. Bakåtkompatibel: proppar är valfria så staff-figuren i
// luckan kan fortsätta använda `variant`-baserad rendering utan
// arketyp/face.
//
// **Vad "lemvinkel" innebär i grep-verifieringstermer:** funktionerna
// `Arm` och `Leg` nedan tar en `a: [number, number]`-vinkeltupel och
// applicerar den som `rotate(${-a[0]})` på hip-leden respektive
// `rotate(${-a[1]})` på knä-leden. Grep på `rotate(${` i denna fil
// returnerar därför en punkt per lem-rotation.
//
// **DoD 7-attribut för test-grep:** `data-archetype` skrivs när
// arketyp passas in; `data-face` skrivs när face passas in. Testet
// bevisar därigenom att props når komponenten och renderas.

import type { Pose, FigureVariant } from './rig';
import { RIG_INK, RIG_FAR, RIG_ACCENT, RIG_GROUND } from './rig';
import type { FoodtruckArchetype, HeadTopping, HandProp } from './archetypes';
import type { FaceParams } from './guestFaces';

interface ArmProps {
  a: [number, number];
  fill: string;
}

function Arm({ a, fill }: ArmProps) {
  return (
    <g transform={`translate(0,-96) rotate(${-a[0]})`}>
      <rect x={-9} y={0} width={18} height={48} fill={fill} />
      <g transform={`translate(0,48) rotate(${-a[1]})`}>
        <rect x={-8} y={0} width={16} height={44} fill={fill} />
        <rect x={-9} y={44} width={18} height={15} fill={fill} />
      </g>
    </g>
  );
}

interface LegProps {
  a: [number, number];
  fill: string;
}

function Leg({ a, fill }: LegProps) {
  return (
    <g transform={`rotate(${-a[0]})`}>
      <rect x={-11} y={0} width={22} height={60} fill={fill} />
      <g transform={`translate(0,60) rotate(${-a[1]})`}>
        <rect x={-10} y={0} width={20} height={62} fill={fill} />
        <rect x={-9} y={62} width={34} height={12} fill={fill} />
      </g>
    </g>
  );
}

// -----------------------------------------------------------------------------
// Face — renderar FaceParams inuti huvudet
// -----------------------------------------------------------------------------
//
// **Omskriven 2026-08-17 (rev 3)** — VO-fynd: munnen syntes inte,
// accent-remsan låg där munnen skulle vara. Rot-orsak: tidigare Face
// hade origo på ansikts-mitten (translate 0,-40) och mun-y=-20 =
// 17% från ansikts-toppen. Prototypens StaffFace.dc.html-mun sitter
// vid `bottom: 26 px` av en 132-hög box = 80% ner från toppen.
//
// Face renderas nu i prototypens **exakta 118×132 px koordinat-
// system** och skalas via wrapper-transform till vår 54×58 ansiktsruta.
// Alla FaceParams (browTopL, eyeTopL, mouthW, mouthRot) tolkas direkt
// som prototype's `top: X px` / `bottom: X px` — inga koordinat-hack.
//
// Face-origo är TOPP-VÄNSTER av ansiktsrutan (Head-frame y=-70, x=-27).
// Skala: 54/118 ≈ 0.458 (x), 58/132 ≈ 0.439 (y).

const FACE_PROTO_W = 118;   // prototype StaffFace.dc.html width
const FACE_PROTO_H = 132;   // prototype StaffFace.dc.html height
const FACE_TARGET_W = 54;   // vår ansikts-rutas bredd (från Head)
const FACE_TARGET_H = 58;   // vår ansikts-rutas höjd

interface FaceProps {
  params: FaceParams;
  ink?: string;
}

function Face({ params: p, ink = RIG_INK }: FaceProps) {
  const SX = FACE_TARGET_W / FACE_PROTO_W;
  const SY = FACE_TARGET_H / FACE_PROTO_H;
  const mouthHalfW = p.mouthW / 2;
  const mouthCenterX = FACE_PROTO_W / 2;

  // Ögonbryn — prototypens CSS: `left: 21px width: 16px top: browTopL`.
  // Ögonbrynet är centrerat vid x = 21 + 8 = 29 för vänster ögonbryn,
  // och x = 118-21-8 = 89 för höger.
  const browXL = 29;
  const browXR = FACE_PROTO_W - 29;

  // Ögon — prototypens CSS: `left: 24px width: 12px top: eyeTopL h: eyeHL`.
  // Vi ritar rect direkt vid samma koordinater.

  return (
    <g data-face-inner transform={`scale(${SX}, ${SY})`}>
      {/* Ögonbryn — rotera kring bryn-mittpunkt så roterade bryn inte
          "vandrar" bort från sin plats. */}
      <g transform={`rotate(${p.browRotL}, ${browXL}, ${p.browTopL + 2.5})`}>
        <rect x={browXL - 8} y={p.browTopL} width={16} height={5} fill={ink} />
      </g>
      <g transform={`rotate(${p.browRotR}, ${browXR}, ${p.browTopR + 2.5})`}>
        <rect x={browXR - 8} y={p.browTopR} width={16} height={5} fill={ink} />
      </g>
      {/* Ögon — direkt-mappat från prototype (left:24 w:12, right:24 w:12) */}
      <rect x={24} y={p.eyeTopL} width={12} height={p.eyeHL} fill={ink} />
      <rect x={FACE_PROTO_W - 24 - 12} y={p.eyeTopR} width={12} height={p.eyeHR} fill={ink} />
      {/* Mun — form + position varierar per MouthKind. Alla mun-formar
          positionerade från BOTTEN av 132-frame (matchar prototypens
          `bottom: N px` convention). Prototype-värden:
            line:  bottom 26, height 5
            smile: bottom 22, height 13
            box:   bottom 20, height 16
            o:     bottom 20, height 22
          Munnen sitter ~75-80% ner från toppen — kritiskt för läsbarhet. */}
      {p.mouth === 'line' && (
        <g transform={`translate(${mouthCenterX}, ${FACE_PROTO_H - 26 - 2.5}) rotate(${p.mouthRot})`}>
          <rect x={-mouthHalfW} y={0} width={p.mouthW} height={5} fill={ink} />
        </g>
      )}
      {p.mouth === 'smile' && (() => {
        // **Omskriven 2026-08-17 (rev 4)** — VO-fynd: fyra face-nycklar
        // (forvantansfull, nojd, imponerad, tacksam) använde alla
        // `smile` med bara mouthW-skillnad (32-40 units). Tidigare
        // bracket-path (M-L-L-L) rendrade som platta rektangel-outlines
        // som såg ut som streck vid små CSS-skalor. Nu quadratic-arc:
        // ändarna sitter UPPE (smile-hörn), mitten SAKNAR nedåt =
        // "leende bågen dippar ner mellan uppåtvinklade hörn". Djupet
        // skalas mot mouthW så bredare mun = djupare båge = mer synlig.
        const y = FACE_PROTO_H - 22 - 6;   // baseline (mitt av mun-region)
        const arcDepth = Math.max(6, p.mouthW * 0.35);  // 11-14 units för mouthW 32-40
        return (
          <path
            d={`M ${mouthCenterX - mouthHalfW} ${y} Q ${mouthCenterX} ${y + arcDepth} ${mouthCenterX + mouthHalfW} ${y}`}
            fill="none"
            stroke={ink}
            strokeWidth={6}
            strokeLinecap="round"
          />
        );
      })()}
      {p.mouth === 'frown' && (() => {
        // Spegling av smile — samma arc men NEGATIV djup så bågen bågar
        // UPPÅT (sad-arch) istället för nedåt. Skalning identisk med
        // smile så mirror-relationen är exakt.
        const y = FACE_PROTO_H - 22 - 6;
        const arcDepth = Math.max(6, p.mouthW * 0.35);
        return (
          <path
            d={`M ${mouthCenterX - mouthHalfW} ${y} Q ${mouthCenterX} ${y - arcDepth} ${mouthCenterX + mouthHalfW} ${y}`}
            fill="none"
            stroke={ink}
            strokeWidth={6}
            strokeLinecap="round"
          />
        );
      })()}
      {p.mouth === 'box' && (
        <rect
          x={mouthCenterX - mouthHalfW}
          y={FACE_PROTO_H - 20 - 16}
          width={p.mouthW}
          height={16}
          fill="none"
          stroke={ink}
          strokeWidth={5}
        />
      )}
      {p.mouth === 'o' && (
        <rect
          x={mouthCenterX - 12}
          y={FACE_PROTO_H - 20 - 22}
          width={24}
          height={22}
          fill={ink}
        />
      )}
      {/* Svettdroppe (generad) — höger-topp per prototype (right:8 top:20). */}
      {p.drop && (
        <rect x={FACE_PROTO_W - 8 - 9} y={20} width={9} height={16} fill={RIG_ACCENT} />
      )}
    </g>
  );
}

// -----------------------------------------------------------------------------
// Head-topping — arketyp-specifik frisyr / huvudbonad
// -----------------------------------------------------------------------------
//
// Ordertexten §3.1 + utkastet: "huvudbonaden bär halva igenkänningen".
// Sex toppings mappar mot de sex arketyperna. Cap/Bun/plain-varianterna
// behålls för bakåtkompatibilitet med staff-figuren.

function renderHeadTopping(topping: HeadTopping) {
  switch (topping) {
    case 'ruffled':
      // Barnet — rufsigt hår som flera små bulor
      return (
        <g>
          <rect x={-29} y={-78} width={58} height={12} fill={RIG_INK} />
          <rect x={-24} y={-84} width={10} height={8} fill={RIG_INK} />
          <rect x={-8} y={-86} width={12} height={10} fill={RIG_INK} />
          <rect x={12} y={-83} width={10} height={7} fill={RIG_INK} />
        </g>
      );
    case 'shortCut':
      // Affärsgästen — kort hår som tunn linje
      return <rect x={-29} y={-76} width={58} height={8} fill={RIG_INK} />;
    case 'workCap':
      // Efter skiftet — keps med skärm
      return (
        <g>
          <rect x={-29} y={-78} width={58} height={16} fill={RIG_INK} />
          <rect x={-29} y={-64} width={40} height={7} fill={RIG_INK} />
        </g>
      );
    case 'sunHat':
      // Turisten — bred solhatt
      return (
        <g>
          <rect x={-42} y={-70} width={84} height={7} fill={RIG_INK} />
          <rect x={-25} y={-80} width={50} height={12} fill={RIG_INK} />
        </g>
      );
    case 'grayHair':
      // Stamgästen — grått hår
      return (
        <g>
          <rect x={-29} y={-78} width={58} height={12} fill={RIG_FAR} />
          <rect x={-24} y={-84} width={48} height={8} fill={RIG_FAR} />
        </g>
      );
    case 'hoodRaised':
      // Nattarbetaren — huva runt om huvudet
      return (
        <g>
          <rect x={-33} y={-80} width={66} height={18} fill={RIG_INK} />
          <rect x={-33} y={-62} width={7} height={30} fill={RIG_INK} />
          <rect x={26} y={-62} width={7} height={30} fill={RIG_INK} />
        </g>
      );
  }
}

// -----------------------------------------------------------------------------
// Prop — objekt i handen, bredvid figuren
// -----------------------------------------------------------------------------

function renderProp(prop: HandProp) {
  if (prop === null) return null;
  switch (prop) {
    case 'iceCream':
      // Barnet — glass: kon + kula, i höger hand (positiv x)
      return (
        <g transform="translate(28, -40)">
          <path d="M -8 0 L 0 20 L 8 0 Z" fill={RIG_ACCENT} />
          <circle cx={0} cy={-4} r={10} fill={RIG_GROUND} stroke={RIG_INK} strokeWidth={2} />
        </g>
      );
    case 'briefcase':
      // Affärsgästen — portfölj med handtag
      return (
        <g transform="translate(30, -30)">
          <rect x={-14} y={0} width={28} height={22} fill={RIG_INK} />
          <rect x={-8} y={-6} width={16} height={4} fill="none" stroke={RIG_INK} strokeWidth={2} />
        </g>
      );
    case 'camera':
      // Turisten — kamera på magen
      return (
        <g transform="translate(0, -60)">
          <rect x={-14} y={-6} width={28} height={16} fill={RIG_INK} />
          <circle cx={0} cy={2} r={6} fill={RIG_ACCENT} stroke={RIG_INK} strokeWidth={1.5} />
        </g>
      );
    case 'thermos':
      // Nattarbetaren — termos: cylinder + lock
      return (
        <g transform="translate(26, -50)">
          <rect x={-6} y={0} width={12} height={28} fill={RIG_ACCENT} stroke={RIG_INK} strokeWidth={2} />
          <rect x={-7} y={-4} width={14} height={4} fill={RIG_INK} />
        </g>
      );
  }
}

// -----------------------------------------------------------------------------
// Head — utökat med Face-rendering + head-topping-parametrar
// -----------------------------------------------------------------------------

interface HeadProps {
  headAngle: number;
  mouth: number;
  variant: FigureVariant;
  face?: FaceParams;
  headTopping?: HeadTopping;
  skinTone?: string;
}

function Head({ headAngle, mouth, variant, face, headTopping, skinTone }: HeadProps) {
  const faceFill = skinTone ?? RIG_GROUND;
  return (
    <g transform={`translate(0,-112) rotate(${-headAngle})`}>
      {/* Nacke */}
      <rect x={-11} y={-16} width={22} height={18} fill={RIG_INK} />
      {/* Ansikte (bakgrund + kontur) — fyllning är hudton om angiven */}
      <rect
        x={-27}
        y={-70}
        width={54}
        height={58}
        fill={faceFill}
        stroke={RIG_INK}
        strokeWidth={4}
      />
      {/* Head-topping — arketyp-specifik OM headTopping passas in, annars
          fall tillbaka på gammal variant-baserad rendering (bakåtkompat
          för staff-figuren i luckan). */}
      {headTopping !== undefined ? (
        renderHeadTopping(headTopping)
      ) : (
        <>
          {variant === 'Cap' && (
            <g>
              <rect x={-29} y={-78} width={58} height={18} fill={RIG_ACCENT} />
              <rect x={27} y={-66} width={26} height={7} fill={RIG_ACCENT} />
            </g>
          )}
          {variant === 'Bun' && (
            <g>
              <rect x={-29} y={-76} width={58} height={16} fill={RIG_INK} />
              <circle cx={-36} cy={-58} r={17} fill={RIG_INK} />
            </g>
          )}
          {variant === 'plain' && (
            <rect x={-29} y={-76} width={58} height={16} fill={RIG_INK} />
          )}
        </>
      )}
      {/* Öra */}
      <rect x={17} y={-48} width={8} height={10} fill={RIG_INK} />
      {/* Ansiktsuttryck — OM face passas in ritas den från TOPP-VÄNSTER
          av ansiktsrutan (x=-27, y=-70 i Head-frame) så prototypens
          top/bottom-koordinater mappar direkt. Face-komponenten skalar
          internt från prototypens 118×132-frame till vår 54×58 ruta.
          Utan face: gammal mun-höjd-baserad rendering (bakåtkompat). */}
      {face !== undefined ? (
        <g transform="translate(-27, -70)">
          <Face params={face} />
        </g>
      ) : (
        <rect x={4} y={-30} width={14} height={2 + mouth * 9} fill={RIG_INK} />
      )}
    </g>
  );
}

export interface FigureProps {
  pose: Pose;
  x: number;
  y: number;
  scale: number;
  variant: FigureVariant;
  // Test-hook: data-attribut för grep i tester.
  id?: string;
  // ORDER 114 — valfria arketyp/face/skinTone. När passade in ritas
  // arketyp-specifik topping + prop + face; utan dem faller Figure
  // tillbaka på det gamla variant-baserade utseendet.
  archetype?: FoodtruckArchetype;
  face?: FaceParams;
  faceKey?: string;     // enbart för data-attribut / debug
  skinTone?: string;
  // ORDER 114 rev 4 — facing-riktning: 1 = default (öra på höger sida
  // av vår vy, figur läses som "vänder sig lite mot vänster"), -1 =
  // horisontell-flip (öra på vänster sida av vår vy, figur "vänder
  // sig mot höger"). Foodtruck-kön står LÄNGE till vänster om luckan;
  // figurer i kön ska titta höger (mot luckan) → -1. Leaving-figurer
  // som går ut åt höger håller default (1) så de "vänder sig ut ur
  // scenen". Alla varianter fortsätter fungera i sim-koordinater;
  // flippen tillämpas som `scale(-1, 1)` på figur-transformen.
  facingDirection?: 1 | -1;
}

// Huvudkomponenten — komponerar Arm/Leg/Head + torso enligt Guest-
// komponentens layer-ordning från prototypen (rad 114-148).
export function Figure({ pose, x, y, scale, variant, id, archetype, face, faceKey, skinTone, facingDirection = 1 }: FigureProps) {
  const p = pose;
  // ORDER 114 rättning (2026-08-17) — UNIFORM scale bara.
  // Tidigare version applicerade `scale(scale * widthMult, scale *
  // heightMult)` non-uniformt, vilket bröt prototypens proportioner:
  // efter_skiftets widthMult=1.15 → head 62 SVG-units bred (istället
  // för 54) → head "nästan lika brett som kroppen" (Vision Owner-fynd
  // 2026-08-17 mot faces.png). Prototypens Guest.tsx rad 115 använder
  // uniform `scale(${scale})`.
  //
  // Nu: uniform skala med heightMult som overall-storleks-modifikator
  // (barnet 0.72 = kort figur, nattarbetaren 1.05 = lång figur). Alla
  // proportioner bevaras. widthMult behålls i archetype-data men rör
  // INTE outer-scale längre — reserverad för framtida torso-only-width-
  // variation (fat/thin) via t.ex. torso-rect-override, ej aspect-
  // brytande scale-hack.
  const heightMult = archetype?.body.heightMult ?? 1;
  const uniformScale = scale * heightMult;
  const skin = skinTone ?? RIG_GROUND;
  // facingDirection=-1 speglar figuren horisontellt (öra + prop + pose-
  // asymmetri byter sida). Applicerat i outer-scale så alla inre
  // element följer med.
  const scaleX = uniformScale * facingDirection;
  return (
    <g
      data-figure={id ?? 'anonymous'}
      data-figure-lean={p.lean.toFixed(3)}
      data-figure-leg-near={p.legNear[0].toFixed(3)}
      data-archetype={archetype?.id ?? ''}
      data-face={faceKey ?? ''}
      data-skin-tone={skinTone ?? ''}
      data-facing={facingDirection === -1 ? 'right' : 'left'}
      transform={`translate(${x},${y}) scale(${scaleX}, ${uniformScale})`}
    >
      <g transform={`translate(0,${-122 + p.hipDrop}) rotate(${-p.lean})`}>
        {/* Bakre lem först — z-ordning så främre lem täcker */}
        <Leg a={p.legFar} fill={RIG_FAR} />
        <Arm a={p.armFar} fill={RIG_FAR} />
        {/* Torso */}
        <rect x={-31} y={-112} width={62} height={112} fill={RIG_INK} />
        {/* Accent-band längst upp på torson (halsring) */}
        <rect x={-34} y={-112} width={68} height={15} fill={RIG_ACCENT} />
        {/* Främre ben */}
        <Leg a={p.legNear} fill={RIG_INK} />
        {/* Huvud — passar in face + topping + hudton om angivna */}
        <Head
          headAngle={p.head}
          mouth={p.mouth}
          variant={variant}
          face={face}
          headTopping={archetype?.headTopping}
          skinTone={skin}
        />
        {/* Främre arm — sist så den täcker torson */}
        <Arm a={p.armNear} fill={RIG_INK} />
        {/* Prop — objekt i handen, sist så inget täcker den */}
        {archetype && renderProp(archetype.prop)}
      </g>
    </g>
  );
}
