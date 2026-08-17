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
// Face-geometri kopierad från StaffFace.dc.html. Prototypens tabell
// har staff-vokabulär; VÄRDENA passas in via GuestFaces.GUEST_FACES
// (10 författade uttryck per ORDER 114 §3.2).
//
// Origin: ansikts-lokalt koordinat-system centrerat på näsan.
// Y-axel växer NED (SVG-konvention). Params.browTop, params.eyeTop
// är i denna lokala frame. Skalas av föräldrar (huvud-rotation +
// figur-scale).

interface FaceProps {
  params: FaceParams;
  ink?: string;   // linje-färg (defaults RIG_INK)
}

function Face({ params: p, ink = RIG_INK }: FaceProps) {
  const eyeXL = -13;
  const eyeXR = 13;
  const mouthY = -20;
  const mouthHalfW = p.mouthW / 2;
  return (
    <g data-face-inner>
      {/* Ögonbryn */}
      <g transform={`translate(${eyeXL}, ${-p.browTopL}) rotate(${p.browRotL})`}>
        <rect x={-10} y={-2} width={20} height={4} fill={ink} />
      </g>
      <g transform={`translate(${eyeXR}, ${-p.browTopR}) rotate(${p.browRotR})`}>
        <rect x={-10} y={-2} width={20} height={4} fill={ink} />
      </g>
      {/* Ögon — höjd anger öppenhet (större = vidöppen, mindre = trött) */}
      <rect x={eyeXL - 4} y={-p.eyeTopL} width={8} height={p.eyeHL} fill={ink} />
      <rect x={eyeXR - 4} y={-p.eyeTopR} width={8} height={p.eyeHR} fill={ink} />
      {/* Mun — form varierar per MouthKind */}
      <g transform={`translate(0, ${mouthY}) rotate(${p.mouthRot})`}>
        {p.mouth === 'line' && (
          <rect x={-mouthHalfW} y={-1} width={p.mouthW} height={3} fill={ink} />
        )}
        {p.mouth === 'smile' && (
          <path
            d={`M ${-mouthHalfW} 0 Q 0 ${p.mouthW * 0.25} ${mouthHalfW} 0`}
            fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round"
          />
        )}
        {p.mouth === 'frown' && (
          <path
            d={`M ${-mouthHalfW} 4 Q 0 ${-p.mouthW * 0.2} ${mouthHalfW} 4`}
            fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round"
          />
        )}
        {p.mouth === 'box' && (
          <rect x={-mouthHalfW} y={-3} width={p.mouthW} height={7} fill={ink} />
        )}
        {p.mouth === 'o' && (
          <ellipse cx={0} cy={0} rx={mouthHalfW * 0.6} ry={mouthHalfW * 0.5} fill={ink} />
        )}
      </g>
      {/* Svettdroppe (generad) */}
      {p.drop && (
        <ellipse cx={-24} cy={-22} rx={3} ry={5} fill={ink} opacity={0.6} />
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
      {/* Ansiktsuttryck — OM face passas in ritas den vid mitten av
          ansiktsrutan; annars fall tillbaka på gammal mun-höjd-baserad
          rendering (bakåtkompat). */}
      {face !== undefined ? (
        <g transform="translate(0, -40)">
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
}

// Huvudkomponenten — komponerar Arm/Leg/Head + torso enligt Guest-
// komponentens layer-ordning från prototypen (rad 114-148).
export function Figure({ pose, x, y, scale, variant, id, archetype, face, faceKey, skinTone }: FigureProps) {
  const p = pose;
  // Arketyp-kroppsskala tillämpas som multiplikativ transform ovanpå
  // scale-argumentet — så att FoodtruckScene:s QUEUE_FIGURE_SCALE
  // fortsätter styra basen och arketyp lägger på breddad/kortad kropp.
  const bodyH = archetype?.body.heightMult ?? 1;
  const bodyW = archetype?.body.widthMult ?? 1;
  const effectiveScaleX = scale * bodyW;
  const effectiveScaleY = scale * bodyH;
  const skin = skinTone ?? RIG_GROUND;
  return (
    <g
      data-figure={id ?? 'anonymous'}
      data-figure-lean={p.lean.toFixed(3)}
      data-figure-leg-near={p.legNear[0].toFixed(3)}
      data-archetype={archetype?.id ?? ''}
      data-face={faceKey ?? ''}
      data-skin-tone={skinTone ?? ''}
      transform={`translate(${x},${y}) scale(${effectiveScaleX}, ${effectiveScaleY})`}
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
