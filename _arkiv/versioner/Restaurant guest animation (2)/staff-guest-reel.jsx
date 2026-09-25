// staff-guest-reel.jsx — Nexus Studio: hela ensemblen i helkropp.
// Ledad rigg (bål, huvud, två armar med armbåge, två ben med knä) — samma
// konstruktion som gästreelen, nu parametriserad för ålder, kropp, roll och mimik.

const { CompositionStage, useComposition, Captions, Easing, interpolate, animate } = window;
const { useTweaks, TweaksPanel, TweakSection, TweakToggle } = window;

const INK = '#201e1d';
const BG = '#f3f2f2';
const PANEL = '#eae9e9';
const ACCENT = '#ec3013';
const LINE = '#d5d2d1';
const LINEN = '#ddd8d0';
const WOOD = '#a99f8d';
const HEAD_F = 'Archivo, system-ui, sans-serif';

const SKIN = ['#f2d8c0', '#e3b994', '#c8a382', '#a87b55', '#7d5334', '#513524'];
const HAIR = ['#1f1a16', '#3d2b1e', '#5d4a3a', '#8a6b45', '#b9b3ab', '#e6e2dc'];

const enter = (from, to, a, b) => animate({ from, to, start: a, end: b, ease: Easing.easeOutCubic });
const pop = (from, to, a, b) => animate({ from, to, start: a, end: b, ease: Easing.easeOutBack });
const drift = (kfs) => interpolate(kfs.map((k) => k[0]), kfs.map((k) => k[1]), Easing.easeInOutSine);
const win = (T, a, b, f = 0.3) => enter(0, 1, a, a + f)(T) * (1 - enter(0, 1, b, b + f)(T));
const c01 = (v) => Math.max(0, Math.min(1, v));

/* ---------------- expressions ---------------- */
// browRot, browLift, eyeH, mouth, mouthW, mouthRot  — one table drives both the
// front-facing portrait tile and the side profile on every full-body figure.
const FACES = {
  neutral:        [0, 0, 16, 'line', 42, 0],
  glad:           [-8, 4, 10, 'smile', 40, 0],
  artigt:         [0, 2, 8, 'line', 46, -5],
  fokuserad:      [9, -2, 12, 'line', 30, 0],
  stressad:       [14, 4, 18, 'box', 34, 0, 'drop'],
  irriterad:      [18, -6, 9, 'line', 46, 6],
  utmattad:       [-6, -6, 5, 'line', 40, 0],
  förvirrad:      [-16, 6, 14, 'box', 22, 0],
  förvånad:       [0, 10, 20, 'o', 24, 0],
  stolt:          [-6, 2, 9, 'smile', 42, 0, 'badge'],
  förväntansfull: [-10, 8, 16, 'smile', 40, 0],
  nöjd:           [-4, 0, 7, 'smile', 38, 0],
  otålig:         [16, -4, 10, 'line', 38, 8],
  besviken:       [-14, -8, 8, 'line', 44, 9],
  imponerad:      [-4, 10, 18, 'o', 24, 0],
  nyfiken:        [-11, 8, 18, 'o', 22, 0],
  uttråkad:       [0, -7, 6, 'line', 34, 3],
  tacksam:        [-6, 0, 8, 'smile', 38, 0],
  skeptisk:       [-18, 9, 15, 'line', 36, 7],
  generad:        [-8, 6, 7, 'box', 20, 0, 'drop'],
};

function Portrait({ x, y, scale, expression, skin, opacity }) {
  const f = FACES[expression] || FACES.neutral;
  const [rot, lift, eh, mouth, mw, mrot, badge] = f;
  const s = scale == null ? 1 : scale;
  const W = 118, H = 132;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} opacity={opacity == null ? 1 : opacity}>
      <rect x={0} y={0} width={W} height={H} fill={skin || SKIN[2]} stroke={INK} strokeWidth={4} />
      <g transform={`translate(29,${36 - lift}) rotate(${rot})`}><rect x={-8} y={-2} width={16} height={5} fill={INK} /></g>
      <g transform={`translate(${W - 29},${36 - lift}) rotate(${-rot})`}><rect x={-8} y={-2} width={16} height={5} fill={INK} /></g>
      <rect x={24} y={54} width={12} height={eh} fill={INK} />
      <rect x={W - 36} y={54} width={12} height={eh} fill={INK} />
      {mouth === 'line' && <g transform={`translate(${W / 2},${H - 30}) rotate(${mrot})`}><rect x={-mw / 2} y={-2} width={mw} height={5} fill={INK} /></g>}
      {mouth === 'smile' && <path d={`M 28 ${H - 44} L 28 ${H - 32} L ${W - 28} ${H - 32} L ${W - 28} ${H - 44}`} fill="none" stroke={INK} strokeWidth={5} />}
      {mouth === 'box' && <rect x={(W - mw) / 2} y={H - 38} width={mw} height={16} fill="none" stroke={INK} strokeWidth={5} />}
      {mouth === 'o' && <rect x={W / 2 - 12} y={H - 42} width={24} height={22} fill={INK} />}
      {badge === 'drop' && <rect x={W - 19} y={20} width={9} height={16} fill={ACCENT} />}
      {badge === 'badge' && <rect x={6} y={H - 26} width={14} height={14} fill={ACCENT} />}
    </g>
  );
}

/* ---------------- props ---------------- */

function Prop({ kind, u }) {
  const k = u / 22; // scale props with the figure
  const S = ({ children }) => <g transform={`scale(${k})`}>{children}</g>;
  switch (kind) {
    case 'tray': return <S><g><ellipse cx={0} cy={0} rx={26} ry={7} fill="#efeeed" stroke={INK} strokeWidth={3} /><rect x={-8} y={-11} width={16} height={11} fill={ACCENT} /></g></S>;
    case 'plate': return <S><ellipse cx={0} cy={0} rx={19} ry={6} fill="#efeeed" stroke={INK} strokeWidth={3} /></S>;
    case 'plates': return <S><g><ellipse cx={-13} cy={-2} rx={15} ry={5} fill="#efeeed" stroke={INK} strokeWidth={3} /><ellipse cx={15} cy={2} rx={15} ry={5} fill="#efeeed" stroke={INK} strokeWidth={3} /></g></S>;
    case 'stack': return <S><g><rect x={-17} y={-2} width={34} height={5} fill="#efeeed" stroke={INK} strokeWidth={2} /><rect x={-17} y={-9} width={34} height={5} fill="#efeeed" stroke={INK} strokeWidth={2} /><rect x={-17} y={-16} width={34} height={5} fill={ACCENT} /></g></S>;
    case 'pan': return <S><g><ellipse cx={0} cy={0} rx={19} ry={6} fill={INK} /><rect x={17} y={-2} width={21} height={4} fill={INK} /></g></S>;
    case 'pot': return <S><g><rect x={-16} y={-15} width={32} height={17} fill={INK} /><rect x={-21} y={-19} width={42} height={4} fill={INK} /></g></S>;
    case 'knife': return <S><g><rect x={-2} y={-24} width={4} height={17} fill="#b9b3ab" stroke={INK} strokeWidth={1.5} /><rect x={-3} y={-7} width={6} height={10} fill={ACCENT} /></g></S>;
    case 'board': return <S><g><rect x={-18} y={-6} width={36} height={11} fill="#a08a6c" stroke={INK} strokeWidth={2.5} /><rect x={-9} y={-12} width={18} height={6} fill={ACCENT} /></g></S>;
    case 'tongs': return <S><g><rect x={-2} y={-22} width={4} height={22} fill={INK} /><rect x={-10} y={-2} width={8} height={4} fill={INK} /><rect x={2} y={-2} width={8} height={4} fill={INK} /></g></S>;
    case 'piping': return <S><polygon points="-9,-20 9,-20 2,3 -2,3" fill="#efeeed" stroke={INK} strokeWidth={2.5} /></S>;
    case 'shaker': return <S><g><rect x={-9} y={-4} width={18} height={30} fill={ACCENT} /><rect x={-11} y={-10} width={22} height={6} fill={INK} /></g></S>;
    case 'bottle': return <S><g><rect x={-7} y={-4} width={14} height={30} fill="#3f5136" stroke={INK} strokeWidth={2.5} /><rect x={-3} y={-16} width={6} height={12} fill="#3f5136" /></g></S>;
    case 'mop': return <S><g><rect x={-2} y={-6} width={4} height={64} fill="#6b5b47" /><ellipse cx={0} cy={60} rx={20} ry={7} fill={ACCENT} /></g></S>;
    case 'glass': return <S><rect x={-7} y={-23} width={14} height={23} fill="#efeeed" stroke={INK} strokeWidth={3} /></S>;
    case 'cup': return <S><g><rect x={-10} y={-15} width={20} height={15} fill="#efeeed" stroke={INK} strokeWidth={3} /><rect x={11} y={-12} width={8} height={8} fill="none" stroke={INK} strokeWidth={3} /></g></S>;
    case 'pad': return <S><g><rect x={-12} y={-28} width={24} height={29} fill="#efeeed" stroke={INK} strokeWidth={3} /><rect x={-12} y={-28} width={24} height={7} fill={ACCENT} /></g></S>;
    case 'menu': return <S><g><rect x={-14} y={-34} width={28} height={35} fill="#efeeed" stroke={INK} strokeWidth={3} /><rect x={-14} y={-34} width={28} height={8} fill={ACCENT} /><rect x={-9} y={-20} width={18} height={3} fill={INK} opacity={0.5} /><rect x={-9} y={-12} width={18} height={3} fill={INK} opacity={0.5} /></g></S>;
    case 'crate': return <S><g><rect x={-21} y={-28} width={42} height={29} fill="#a08a6c" stroke={INK} strokeWidth={3} /><rect x={-21} y={-15} width={42} height={4} fill={INK} /></g></S>;
    case 'towel': return <S><rect x={-13} y={-17} width={27} height={18} fill="#efeeed" stroke={INK} strokeWidth={3} /></S>;
    case 'phone': return <S><rect x={-8} y={-17} width={15} height={24} fill={INK} /></S>;
    case 'card': return <S><rect x={-12} y={-7} width={25} height={15} fill="#efeeed" stroke={INK} strokeWidth={2.5} /></S>;
    case 'cane': return <S><g><rect x={-2} y={-4} width={4} height={62} fill="#6b5b47" /><rect x={-11} y={-8} width={13} height={5} fill="#6b5b47" /></g></S>;
    case 'bag': return <S><g><rect x={-12} y={2} width={24} height={24} fill="#4a4744" stroke={INK} strokeWidth={2.5} /><rect x={-7} y={-5} width={14} height={8} fill="none" stroke={INK} strokeWidth={2.5} /></g></S>;
    case 'toy': return <S><rect x={-8} y={-8} width={16} height={16} fill={ACCENT} /></S>;
    default: return null;
  }
}

/* ---------------- hair & hats (side profile) ---------------- */

function HeadBack({ kind, hw, hh, color }) {
  const c = color || HAIR[1];
  switch (kind) {
    case 'longhair': return <g><rect x={-hw * 0.5} y={-hh} width={hw * 0.55} height={hh * 1.7} fill={c} /><rect x={-hw * 0.5} y={-hh - 3} width={hw * 1.1} height={hh * 0.42} fill={c} /></g>;
    case 'ponytail': return <g><rect x={-hw * 0.5} y={-hh - 3} width={hw * 1.1} height={hh * 0.38} fill={c} /><rect x={-hw * 0.86} y={-hh * 0.72} width={hw * 0.42} height={hh * 0.9} fill={c} /></g>;
    case 'afro': return <ellipse cx={-hw * 0.1} cy={-hh * 0.55} rx={hw * 0.86} ry={hh * 0.74} fill={c} />;
    case 'crop': return <rect x={-hw * 0.5} y={-hh - 3} width={hw * 1.08} height={hh * 0.36} fill={c} />;
    case 'hijab': return <g><ellipse cx={-hw * 0.06} cy={-hh * 0.52} rx={hw * 0.78} ry={hh * 0.68} fill={c} /><rect x={-hw * 0.55} y={-hh * 0.5} width={hw * 0.95} height={hh * 1.5} fill={c} /></g>;
    case 'turban': return <ellipse cx={-hw * 0.04} cy={-hh * 0.82} rx={hw * 0.74} ry={hh * 0.42} fill={c} />;
    case 'bald': return null;
    default: return null;
  }
}

function Hat({ kind, hw, hh }) {
  switch (kind) {
    case 'toque': return <g><rect x={-hw * 0.42} y={-hh * 1.72} width={hw * 0.9} height={hh * 0.78} fill="#efeeed" stroke={INK} strokeWidth={2} /><rect x={-hw * 0.5} y={-hh * 1.02} width={hw * 1.08} height={hh * 0.3} fill="#efeeed" stroke={INK} strokeWidth={2} /></g>;
    case 'cap': return <g><rect x={-hw * 0.5} y={-hh * 1.24} width={hw * 1.06} height={hh * 0.34} fill={ACCENT} /><rect x={hw * 0.5} y={-hh * 1.0} width={hw * 0.6} height={hh * 0.16} fill={ACCENT} /></g>;
    case 'kerchief': return <rect x={-hw * 0.5} y={-hh * 1.2} width={hw * 1.06} height={hh * 0.3} fill={ACCENT} />;
    case 'visor': return <g><rect x={-hw * 0.5} y={-hh * 1.16} width={hw * 1.06} height={hh * 0.16} fill={INK} /><rect x={hw * 0.5} y={-hh * 1.0} width={hw * 0.55} height={hh * 0.13} fill={INK} /></g>;
    case 'hairnet': return <ellipse cx={0} cy={-hh * 0.66} rx={hw * 0.62} ry={hh * 0.5} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="4 3" />;
    case 'kippah': return <ellipse cx={-hw * 0.08} cy={-hh * 1.06} rx={hw * 0.36} ry={hh * 0.13} fill="#3a4a6b" stroke={INK} strokeWidth={1.5} />;
    case 'beanie': return <g><rect x={-hw * 0.5} y={-hh * 1.34} width={hw * 1.06} height={hh * 0.46} fill="#5a6472" /><rect x={-hw * 0.54} y={-hh * 0.94} width={hw * 1.14} height={hh * 0.18} fill="#5a6472" /></g>;
    default: return null;
  }
}

/* ---------------- the head (3/4 view, animated) ---------------- */

function Head({ hw, hh, skin, headBack, hair, hat, face, t, phase, tilt }) {
  const f = FACES[face] || FACES.neutral;
  const [browRot, browLift, eyeH, mouth, mouthW] = f;
  const ft = (t || 0) + (phase || 0);
  const cyc = 3.4 + ((phase || 0) % 1.6);
  const bx = ((ft % cyc) + cyc) % cyc / cyc;
  const blink = bx > 0.962 ? 0.14 : 1;
  const browY = -hh * 0.68 - (browLift / 10) * hh * 0.08;
  const browH = hh * 0.062;
  const eyeY = -hh * 0.48;
  const eyePx = Math.max(hh * 0.05, (eyeH / 20) * hh * 0.3) * blink;
  const mx = hw * 0.3, my = -hh * 0.2;
  const mPx = (mouthW / 46) * hw * 0.5;
  const openPx = hh * 0.04 * (0.5 + 0.5 * Math.sin(ft * 2.6));
  const lead = 2.1 * Math.sin(ft * 2.1) + 1.2 * Math.sin(ft * 0.7);
  return (
    <g transform={`rotate(${(tilt || 0) + lead})`}>
      <rect x={-hw * 0.14} y={-hh * 0.3} width={hw * 0.32} height={hh * 0.38} fill={skin} />
      <HeadBack kind={headBack} hw={hw} hh={hh} color={HAIR[hair == null ? 1 : hair]} />
      <rect x={-hw * 0.5} y={-hh} width={hw * 1.02} height={hh} fill={skin} />
      <Hat kind={hat} hw={hw} hh={hh} />
      <g transform={`translate(${hw * 0.6},${browY}) rotate(${browRot})`}>
        <rect x={-hw * 0.15} y={-browH / 2} width={hw * 0.3} height={browH} fill={INK} />
      </g>
      <g transform={`translate(${hw * 0.16},${browY}) rotate(${-browRot * 0.75})`}>
        <rect x={-hw * 0.1} y={-browH / 2} width={hw * 0.2} height={browH} fill={INK} />
      </g>
      <rect x={hw * 0.51} y={eyeY - eyePx / 2} width={hw * 0.18} height={eyePx} fill={INK} />
      <rect x={hw * 0.09} y={eyeY - eyePx * 0.42} width={hw * 0.13} height={eyePx * 0.84} fill={INK} />
      {mouth === 'line' && <rect x={mx} y={my} width={mPx} height={hh * 0.048} fill={INK} />}
      {mouth === 'smile' && <path d={`M ${mx} ${my - hh * 0.07} L ${mx} ${my + hh * 0.03} L ${mx + mPx} ${my + hh * 0.03} L ${mx + mPx} ${my - hh * 0.07}`} fill="none" stroke={INK} strokeWidth={hh * 0.042} />}
      {mouth === 'box' && <rect x={mx} y={my - hh * 0.05} width={mPx} height={hh * 0.1 + openPx} fill="none" stroke={INK} strokeWidth={hh * 0.038} />}
      {mouth === 'o' && <rect x={mx} y={my - hh * 0.06} width={hw * 0.23} height={hh * 0.09 + openPx} fill={INK} />}
    </g>
  );
}

/* ---------------- the jointed figure ---------------- */

function Figure(p) {
  const s = p.scale == null ? 1 : p.scale;
  const H = 300 * (p.height == null ? 1 : p.height);
  const g = p.girth == null ? 1 : p.girth;
  const u = H / 300;
  const hipY = -H * 0.5;
  const torsoH = H * 0.32;
  const torsoW = H * 0.2 * g;
  const armW = H * 0.055 * g;
  const legW = H * 0.066 * g;
  const upper = H * 0.155, fore = H * 0.145;
  const thigh = H * 0.245, shin = H * 0.235;
  const hw = H * 0.128, hh = H * 0.15;
  const col = p.color;
  const far = `color-mix(in srgb, ${col} 62%, #f3f2f2)`;
  const skin = p.skin || SKIN[2];
  const skinFar = `color-mix(in srgb, ${skin} 70%, #f3f2f2)`;
  const pose = p.pose;
  const ft = (p.t || 0) + (p.phase || 0);
  const breathe = 1 + 0.012 * Math.sin(ft * 1.9);

  const Arm = ({ a, fill, hand, prop }) => (
    <g transform={`translate(0,${-torsoH}) rotate(${a[0]})`}>
      <rect x={-armW / 2} y={0} width={armW} height={upper} fill={fill} />
      <g transform={`translate(0,${upper}) rotate(${a[1]})`}>
        <rect x={-armW * 0.44} y={0} width={armW * 0.88} height={fore} fill={fill} />
        <rect x={-armW * 0.5} y={fore} width={armW} height={armW * 0.82} fill={hand} />
        {prop && (
          <g transform={`translate(0,${fore + armW * 0.6}) rotate(${-(a[0] + a[1] + (pose.lean || 0))})`}>
            <Prop kind={prop} u={u * 22} />
          </g>
        )}
      </g>
    </g>
  );

  const Leg = ({ a, fill }) => (
    <g transform={`rotate(${a[0]})`}>
      <rect x={-legW / 2} y={0} width={legW} height={thigh} fill={fill} />
      <g transform={`translate(0,${thigh}) rotate(${a[1]})`}>
        <rect x={-legW * 0.44} y={0} width={legW * 0.88} height={shin} fill={fill} />
        <rect x={-legW * 0.44} y={shin} width={legW * 1.55} height={H * 0.032} fill={fill} />
      </g>
    </g>
  );

  return (
    <g transform={`translate(${p.x},${p.y}) scale(${s})`} opacity={p.opacity == null ? 1 : p.opacity}>
      <ellipse cx={H * 0.03} cy={0} rx={H * 0.16 * g} ry={H * 0.026} fill="rgba(32,30,29,0.15)" />
      {p.wheels && (
        <g>
          <circle cx={-H * 0.02} cy={-H * 0.13} r={H * 0.13} fill="none" stroke={INK} strokeWidth={H * 0.017} />
          <circle cx={H * 0.19} cy={-H * 0.05} r={H * 0.05} fill="none" stroke={INK} strokeWidth={H * 0.013} />
          <rect x={-H * 0.1} y={-H * 0.27} width={H * 0.3} height={H * 0.02} fill={INK} />
        </g>
      )}
      <g transform={`translate(0,${hipY + (pose.hipDrop || 0) * H}) rotate(${pose.lean || 0})`}>
        <Leg a={pose.legFar} fill={far} />
        <Arm a={pose.armFar} fill={far} hand={skinFar} prop={p.propFar} />
        <rect x={-torsoW / 2} y={-torsoH * breathe} width={torsoW} height={torsoH * breathe} fill={col} />
        {p.apron && <g>
          <rect x={-torsoW * 0.46} y={-torsoH * 0.42} width={torsoW * 0.92} height={torsoH * 0.46} fill={LINEN} />
          <rect x={-torsoW * 0.46} y={-torsoH * 0.44} width={torsoW * 0.92} height={torsoH * 0.05} fill="#b3aca2" />
        </g>}
        {p.belt && <rect x={-torsoW / 2} y={-torsoH * 0.36} width={torsoW} height={torsoH * 0.07} fill={ACCENT} />}
        <Leg a={pose.legNear} fill={col} />
        <g transform={`translate(0,${-torsoH})`}>
          <Head hw={hw} hh={hh} skin={skin} headBack={p.headBack} hair={p.hair} hat={p.hat}
                face={p.face} t={p.t} phase={p.phase} tilt={pose.headTilt || 0} />
        </g>
        <Arm a={pose.armNear} fill={col} hand={skin} prop={p.prop} />
        {p.alert && <rect x={-hw * 0.18} y={-torsoH - hh * 1.9} width={hw * 0.36} height={hw * 0.36} fill={ACCENT} />}
      </g>
    </g>
  );
}

/* ---------------- pose library ---------------- */

const knee = (ph, off) => -9 - 28 * Math.max(0, Math.sin(2 * Math.PI * (ph + off) + 1.1));

function walk(ph, amp) {
  const sn = Math.sin(2 * Math.PI * ph);
  return {
    lean: 4, headTilt: -1 + 1.4 * sn, hipDrop: 0.012 * Math.abs(sn),
    legNear: [26 * amp * sn, knee(ph, 0)],
    legFar: [-26 * amp * sn, knee(ph, 0.5)],
    armNear: [-22 * amp * sn, 14 + 10 * Math.max(0, sn)],
    armFar: [22 * amp * sn, 14 + 10 * Math.max(0, -sn)],
  };
}

function stand(t, hz) {
  const b = Math.sin(t * (hz || 1.6));
  return {
    lean: 2 + 0.6 * b, headTilt: 1.4 * Math.sin(t * 1.1), hipDrop: 0.004 + 0.004 * b,
    legNear: [-3, -3], legFar: [4, -4], armNear: [-3, 13], armFar: [5, 12],
  };
}

const SIT = {
  lean: 5, headTilt: 0, hipDrop: 0.155,
  legNear: [88, -86], legFar: [83, -80], armNear: [58, 42], armFar: [52, 46],
};
const sit = (over) => Object.assign({}, SIT, over);

/* ---------------- cast ---------------- */

const AGES = [
  { label: 'Barn', years: '4–9 år', height: 0.56, girth: 0.86, hz: 2.6, amp: 1.15, speed: '1,5', headBack: 'crop', hair: 1, skin: 1, face: 'nyfiken', prop: 'toy' },
  { label: 'Tonåring', years: '13–17 år', height: 0.93, girth: 0.88, hz: 1.7, amp: 1, speed: '1,3', headBack: 'longhair', hair: 0, skin: 3, face: 'uttråkad', prop: 'phone', lean: -3 },
  { label: 'Vuxen', years: '25–55 år', height: 1, girth: 1, hz: 1.9, amp: 1, speed: '1,4', headBack: 'crop', hair: 2, skin: 0, face: 'neutral', prop: 'glass' },
  { label: 'Senior', years: '70+ år', height: 0.94, girth: 1.06, hz: 1.1, amp: 0.6, speed: '0,7', headBack: 'crop', hair: 4, skin: 0, face: 'tacksam', prop: 'cane', lean: 6 },
  { label: 'Rullstol', years: 'alla åldrar', height: 0.9, girth: 1.04, hz: 0.6, amp: 0, speed: '1,1', headBack: 'crop', hair: 2, skin: 4, face: 'nöjd', prop: 'bag', wheels: true },
];

const GUESTS = [
  { label: 'Barn', color: '#9a8d78', height: 0.56, girth: 0.86, headBack: 'crop', hair: 1, skin: 1, prop: 'toy', face: 'nyfiken', pose: (t) => sit({ hipDrop: 0.15, armNear: [72, 54 + 14 * Math.sin(t * 4)], headTilt: 4 }) },
  { label: 'Tonåring', color: '#7f7a6d', height: 0.93, girth: 0.88, headBack: 'longhair', hair: 0, skin: 3, prop: 'phone', face: 'uttråkad', pose: () => sit({ lean: -4, headTilt: 10, armNear: [86, 66] }) },
  { label: 'Ung vuxen', color: '#8a8070', height: 0.99, girth: 0.95, headBack: 'afro', hair: 0, skin: 4, prop: 'glass', face: 'förväntansfull', pose: (t) => sit({ armNear: [64 + 6 * Math.sin(t * 1.4), 44] }) },
  { label: 'Förälder', color: '#87796a', height: 1, girth: 1.02, headBack: 'ponytail', hair: 2, skin: 1, prop: 'plate', face: 'glad', pose: (t) => sit({ lean: 8, armNear: [46 + 10 * Math.sin(t * 2.2), 30], headTilt: 6 }) },
  { label: 'Par, medelålders', color: '#7a7168', height: 1, girth: 1.05, headBack: 'crop', hair: 3, skin: 0, prop: 'glass', face: 'nöjd', pose: (t) => sit({ armNear: [78 + 16 * c01(Math.sin(t * 1.6)), 40] }) },
  { label: 'Affärsgäst', color: '#5f6470', height: 1.02, girth: 0.98, headBack: 'hijab', hair: 0, skin: 3, prop: 'pad', face: 'fokuserad', pose: () => sit({ lean: 7, armNear: [54, 52], headTilt: 7 }) },
  { label: 'Efter skiftet', color: '#6f6a60', height: 0.99, girth: 1.08, headBack: 'crop', hat: 'beanie', hair: 2, skin: 2, prop: 'glass', face: 'utmattad', pose: () => sit({ lean: -6, headTilt: -4, armNear: [70, 38], armFar: [64, 44] }) },
  { label: 'Turist', color: '#8f8272', height: 0.97, girth: 1, headBack: 'crop', hat: 'cap', hair: 1, skin: 1, prop: 'phone', face: 'imponerad', pose: (t) => sit({ armNear: [96, 72 + 4 * Math.sin(t * 1.2)], headTilt: 5 }) },
  { label: 'Senior', color: '#83796d', height: 0.94, girth: 1.06, headBack: 'crop', hair: 4, skin: 0, prop: 'cane', face: 'tacksam', pose: (t) => Object.assign(stand(t, 1), { lean: 6, armNear: [16, 10] }) },
  { label: 'Rullstolsgäst', color: '#7d7367', height: 0.9, girth: 1.04, headBack: 'crop', hair: 2, skin: 4, prop: 'bag', face: 'nöjd', wheels: true, pose: () => sit({ hipDrop: 0.17, legNear: [92, -88], legFar: [88, -84], armNear: [62, 40] }) },
  { label: 'Stamgäst', color: '#87796a', height: 1, girth: 1.06, headBack: 'bald', hair: 0, skin: 0, prop: 'glass', face: 'nöjd', pose: (t) => sit({ lean: -3, armNear: [72 + 8 * Math.sin(t * 1.1), 42] }) },
  { label: 'Kritiker', color: '#4f545e', height: 1.01, girth: 0.97, headBack: 'crop', hat: 'kippah', hair: 0, skin: 2, prop: 'pad', face: 'skeptisk', pose: () => sit({ lean: 6, armNear: [50, 56], headTilt: 8 }) },
];

const GESTURES = [
  { label: 'Vinkar på servitör', note: 'överarm 165°, svep ±14°, 2 Hz', face: 'otålig', skin: 3, headBack: 'afro', hair: 0, pose: (t) => sit({ armNear: [162 + 14 * Math.sin(t * 9), 12] }) },
  { label: 'Läser menyn', note: 'armbåge 52°, huvudet lutar 8°', prop: 'menu', face: 'förväntansfull', skin: 1, headBack: 'crop', hair: 2, pose: (t) => sit({ lean: 7, headTilt: 9, armNear: [64, 50 + 3 * Math.sin(t * 1.6)] }) },
  { label: 'Skålar', note: 'lyft 0,18 m, håll 0,6 s', prop: 'glass', face: 'glad', skin: 0, headBack: 'ponytail', hair: 2, pose: (t) => sit({ armNear: [84 + 28 * c01(Math.sin(t * 2.2)), 34] }) },
  { label: 'Kollar klockan', note: 'handen in mot bröstet, 1 s', face: 'otålig', skin: 4, headBack: 'hijab', hair: 0, pose: (t) => sit({ headTilt: 7, armNear: [76 + 26 * c01(Math.sin(t * 1.5)), 84] }) },
  { label: 'Klagar', note: 'pekar på tallriken, 3 stötar', prop: 'plate', face: 'besviken', skin: 2, headBack: 'crop', hair: 1, pose: (t) => sit({ lean: 9, armNear: [42 + 14 * Math.sin(t * 7), 22] }) },
  { label: 'Fotograferar maten', note: 'armbåge 74°, still i 1,2 s', prop: 'phone', face: 'imponerad', skin: 1, headBack: 'longhair', hair: 0, pose: (t) => sit({ headTilt: 10, armNear: [98, 74 + 3 * Math.sin(t * 1.1)] }) },
  { label: 'Betalar', note: 'kortet fram 0,8 s, sedan nick', prop: 'card', face: 'nöjd', skin: 5, headBack: 'bald', hair: 0, pose: (t) => sit({ armNear: [46 + 22 * c01(Math.sin(t * 1.8)), 26] }) },
  { label: 'Lugnar barn', note: 'arm ned 22°, långsam pendel', face: 'tacksam', skin: 0, headBack: 'crop', hair: 3, pose: (t) => sit({ headTilt: 8, armNear: [22 + 12 * Math.sin(t * 1.2), 12] }) },
  { label: 'Ber om notan', note: 'lyft hand 130°, en gång', face: 'artigt', skin: 3, headBack: 'crop', hair: 1, pose: (t) => sit({ armNear: [96 + 44 * c01(Math.sin(t * 1.1)), 16] }) },
];

const DINING = [
  { label: 'Hovmästare', color: '#2a2f3a', belt: true, prop: 'pad', face: 'artigt', speed: '1,0', skin: 2, headBack: 'crop', hair: 0, pose: (t) => Object.assign(walk((t * 0.5) % 1, 0.7), { armNear: [40 + 8 * Math.sin(t * 1.4), 50] }) },
  { label: 'Servitör', color: '#33383f', belt: true, prop: 'tray', face: 'artigt', speed: '1,4', skin: 4, headBack: 'ponytail', hair: 0, pose: (t) => Object.assign(walk((t * 0.9) % 1, 1), { armNear: [-6, 104] }) },
  { label: 'Springare', color: '#33383f', belt: true, prop: 'plates', face: 'stressad', speed: '1,7', skin: 1, headBack: 'crop', hair: 1, pose: (t) => Object.assign(walk((t * 1.35) % 1, 1.2), { lean: 8, armNear: [4, 96] }) },
  { label: 'Bussare', color: '#4a4744', hat: 'kerchief', apron: true, prop: 'stack', face: 'fokuserad', speed: '1,3', skin: 3, headBack: 'crop', hair: 0, pose: (t) => Object.assign(walk((t * 0.85) % 1, 0.95), { armNear: [22, 78], armFar: [16, 74] }) },
  { label: 'Sommelier', color: '#2a2f3a', prop: 'bottle', face: 'stolt', speed: '0,8', skin: 0, headBack: 'crop', hair: 3, pose: (t) => Object.assign(stand(t, 1.2), { armNear: [38 + 10 * c01(Math.sin(t * 1.4)), 62] }) },
  { label: 'Bartender', color: '#2a2f3a', apron: true, prop: 'shaker', face: 'stolt', speed: '0,5', skin: 5, headBack: 'bald', hair: 0, pose: (t) => Object.assign(stand(t, 2), { armNear: [128 + 20 * Math.sin(t * 7), -22 + 10 * Math.sin(t * 7)] }) },
  { label: 'Barista', color: '#2a2f3a', hat: 'visor', apron: true, prop: 'cup', face: 'fokuserad', speed: '0,4', skin: 2, headBack: 'hijab', hair: 0, pose: (t) => Object.assign(stand(t, 1.4), { lean: 6, headTilt: 6, armNear: [48 + 18 * c01(Math.sin(t * 2)), 44] }) },
  { label: 'Kassör', color: '#33383f', belt: true, prop: 'card', face: 'neutral', speed: '0,3', skin: 1, headBack: 'crop', hair: 2, pose: (t) => Object.assign(stand(t, 1.1), { armNear: [44 + 12 * c01(Math.sin(t * 2.4)), 48] }) },
];

const KITCHEN = [
  { label: 'Kökschef', color: '#3d3835', hat: 'toque', apron: true, prop: 'pad', face: 'neutral', speed: '0,6', skin: 0, headBack: 'crop', hair: 4, pose: (t) => Object.assign(stand(t, 0.9), { armNear: [36 + 24 * c01(Math.sin(t * 1.1)), 54] }) },
  { label: 'Souschef', color: '#3d3835', hat: 'toque', apron: true, prop: 'tongs', face: 'fokuserad', speed: '0,7', skin: 3, headBack: 'crop', hair: 0, pose: (t) => Object.assign(stand(t, 1.6), { lean: 7, headTilt: 5, armNear: [34 + 16 * Math.sin(t * 2.6), 34] }) },
  { label: 'Kock, varm', color: '#3d3835', hat: 'toque', apron: true, prop: 'pan', face: 'fokuserad', speed: '0,4', skin: 4, headBack: 'crop', hair: 0, pose: (t) => Object.assign(stand(t, 1.8), { lean: 6, armNear: [30 + 12 * Math.sin(t * 3.2), 48] }) },
  { label: 'Kallskänka', color: '#4a4744', hat: 'hairnet', apron: true, prop: 'knife', face: 'fokuserad', speed: '0,3', skin: 1, headBack: 'ponytail', hair: 2, pose: (t) => Object.assign(stand(t, 2.2), { lean: 9, headTilt: 8, armNear: [26 + 16 * Math.sin(t * 5), 42] }) },
  { label: 'Konditor', color: '#4a4744', hat: 'toque', apron: true, prop: 'piping', face: 'fokuserad', speed: '0,2', skin: 2, headBack: 'crop', hair: 1, pose: (t) => Object.assign(stand(t, 1.1), { lean: 8, headTilt: 9, armNear: [38 + 7 * Math.sin(t * 4), 50] }) },
  { label: 'Grytvakt', color: '#3d3835', hat: 'kerchief', apron: true, prop: 'pot', face: 'stressad', speed: '0,5', skin: 5, headBack: 'bald', hair: 0, pose: (t) => Object.assign(walk((t * 0.7) % 1, 0.7), { lean: 7, armNear: [28, 62], armFar: [22, 58] }) },
  { label: 'Köksbiträde', color: '#4a4744', hat: 'hairnet', apron: true, prop: 'board', face: 'förvirrad', speed: '0,4', skin: 0, headBack: 'crop', hair: 2, pose: (t) => Object.assign(stand(t, 1.5), { lean: 6, headTilt: 7, armNear: [30 + 18 * Math.sin(t * 8), 40] }) },
  { label: 'Diskare', color: '#4a4744', hat: 'kerchief', apron: true, prop: 'towel', face: 'utmattad', speed: '0,2', skin: 3, headBack: 'crop', hair: 1, alert: true, pose: (t) => Object.assign(stand(t, 2.4), { lean: 8, headTilt: 4, armNear: [26 + 18 * Math.sin(t * 10), 46], armFar: [22, 42] }) },
];

const SUPPORT = [
  { label: 'Restaurangchef', color: '#33383f', headBack: 'ponytail', hair: 1, prop: 'pad', face: 'neutral', speed: '1,1', skin: 1, pose: (t) => Object.assign(walk((t * 0.6) % 1, 0.8), { armNear: [38 + 10 * Math.sin(t * 1.2), 48] }) },
  { label: 'Städare', color: '#4a4744', hat: 'cap', prop: 'mop', face: 'neutral', speed: '1,0', skin: 4, headBack: 'crop', hair: 0, pose: (t) => Object.assign(stand(t, 1.3), { lean: 8, armNear: [34 + 18 * Math.sin(t * 2.4), 18], armFar: [26, 22] }) },
  { label: 'Utkörare', color: '#4a4744', hat: 'cap', prop: 'crate', face: 'stressad', speed: '1,6', skin: 2, headBack: 'crop', hair: 1, pose: (t) => Object.assign(walk((t * 1.25) % 1, 1.15), { lean: 10, armNear: [26, 70], armFar: [20, 66] }) },
  { label: 'Lärling', color: '#4a4744', apron: true, prop: 'glass', face: 'generad', speed: '1,1', skin: 5, headBack: 'afro', hair: 0, pose: (t) => Object.assign(walk((t * 0.65) % 1, 0.8), { armNear: [46 + 12 * Math.sin(t * 1.3), 46] }) },
];

const MIMIK = [
  ['nyfiken', 'Barn', 'allt är nytt'], ['uttråkad', 'Tonåring', 'väntar'], ['förväntansfull', 'Gäst', 'anländer'], ['otålig', 'Gäst', 'väntar för länge'],
  ['besviken', 'Gäst', 'fel tallrik'], ['skeptisk', 'Kritiker', 'läser rummet'], ['imponerad', 'Turist', 'första rätten'], ['tacksam', 'Senior', 'blev sedd'],
  ['nöjd', 'Gäst', 'betalar'], ['artigt', 'Servitör', 'vid bordet'], ['stressad', 'Springare', 'sex tallrikar'], ['fokuserad', 'Kock', 'i linjen'],
  ['irriterad', 'Kökschef', 'retur'], ['generad', 'Lärling', 'tappade glaset'], ['utmattad', 'Diskare', 'timme fem'], ['stolt', 'Sommelier', 'rätt flaska'],
];

/* ---------------- chrome ---------------- */

const Kicker = ({ children, color, size }) => (
  <div style={{ font: `800 ${size || 20}px ${HEAD_F}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: color || INK }}>{children}</div>
);

function Table({ x, y, w, u }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={u * 0.5} fill={WOOD} stroke={INK} strokeWidth={3} />
      <rect x={x + u * 0.4} y={y + u * 0.5} width={u * 0.4} height={u * 3.4} fill={WOOD} />
      <rect x={x + w - u * 0.8} y={y + u * 0.5} width={u * 0.4} height={u * 3.4} fill={WOOD} />
    </g>
  );
}

function Chair({ cx, cy, h, u }) {
  const seat = cy - h * 0.345;
  return (
    <g>
      <rect x={cx - u * 1.5} y={seat} width={u * 2.5} height={u * 0.22} fill="#8b8477" stroke={INK} strokeWidth={2.5} />
      <rect x={cx - u * 1.42} y={seat + u * 0.22} width={u * 0.2} height={cy - seat - u * 0.22} fill="#8b8477" />
      <rect x={cx + u * 0.8} y={seat + u * 0.22} width={u * 0.2} height={cy - seat - u * 0.22} fill="#8b8477" />
      <rect x={cx - u * 1.5} y={seat - u * 1.5} width={u * 0.22} height={u * 1.5} fill="#8b8477" stroke={INK} strokeWidth={2} />
    </g>
  );
}

function Bench({ x, y, w, u }) {
  return <g><rect x={x} y={y} width={w} height={u * 0.42} fill="#8b8477" stroke={INK} strokeWidth={2.5} /><rect x={x + u * 0.2} y={y + u * 0.42} width={u * 0.34} height={u * 1.5} fill="#8b8477" /><rect x={x + w - u * 0.54} y={y + u * 0.42} width={u * 0.34} height={u * 1.5} fill="#8b8477" /></g>;
}

function Counter({ y, label }) {
  return (
    <g>
      <rect x={120} y={y} width={1680} height={13} fill="#767268" stroke={INK} strokeWidth={3} />
      <text x={132} y={y - 10} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={17} letterSpacing="0.14em" opacity={0.7}>{label}</text>
    </g>
  );
}

function Floor({ opacity }) {
  const l = [];
  for (let i = -14; i <= 26; i++) {
    l.push(<line key={`a${i}`} x1={i * 120 - 400} y1={0} x2={i * 120 + 500} y2={1080} stroke={LINE} strokeWidth={2} />);
    l.push(<line key={`b${i}`} x1={i * 120 + 500} y1={0} x2={i * 120 - 400} y2={1080} stroke={LINE} strokeWidth={2} />);
  }
  return <g opacity={opacity}>{l}</g>;
}

/* ---------------- role grid ---------------- */

function RoleGrid({ list, T, cue, cols, x0, dx, y0, dy, scale, ground }) {
  return (
    <g>
      {list.map((r, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const cx = x0 + col * dx, cy = y0 + row * dy;
        const at = cue + 0.1 + i * 0.1;
        const op = enter(0, 1, at, at + 0.35)(T);
        const t = T + i * 1.7;
        return (
          <g key={r.label} opacity={op}>
            {ground && <rect x={cx - 118} y={cy} width={236} height={3} fill={INK} opacity={0.25} />}
            <Figure x={cx} y={cy} scale={scale} color={r.color} height={r.height} girth={r.girth}
                    hat={r.hat} headBack={r.headBack} hair={r.hair} skin={SKIN[r.skin == null ? 2 : r.skin]}
                    apron={r.apron} belt={r.belt} prop={r.prop} face={r.face} alert={r.alert}
                    pose={r.pose(t)} t={t} phase={i * 0.83} />
            <text x={cx - 118} y={cy + 40} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={20} letterSpacing="0.09em">{r.label.toUpperCase()}</text>
            <text x={cx - 118} y={cy + 66} fill={ACCENT} fontFamily={HEAD_F} fontWeight={800} fontSize={19} letterSpacing="0.05em">{r.speed} m/s</text>
          </g>
        );
      })}
    </g>
  );
}

/* ---------------- the piece ---------------- */

function Piece({ tw }) {
  const { T, CUES: C, authoredTotal: TOTAL } = useComposition();
  const showFaces = tw.showFaces !== false;
  const showRig = tw.showRig === true;

  const floorOp = drift([[0, 1], [C.Mimik - 0.5, 1], [C.Mimik, 0.14], [C.Ansikten, 0.14], [C.Kontakt - 0.4, 1]])(T);
  const rigOp = win(T, 0.1, C.Aldrar - 0.35, 0.4);
  const rigCall = (i) => enter(0, 1, 2.9 + i * 0.24, 3.4 + i * 0.24)(T);
  const aOp = win(T, C.Aldrar, C.Gaster - 0.35, 0.4);
  const gOp = win(T, C.Gaster, C.Gester - 0.35, 0.4);
  const geOp = win(T, C.Gester, C.Matsal - 0.35, 0.4);
  const mOp = win(T, C.Matsal, C.Kok - 0.35, 0.4);
  const kOp = win(T, C.Kok, C.Mimik - 0.35, 0.4);
  const miOp = win(T, C.Mimik, C.Ansikten - 0.35, 0.4);
  const anOp = win(T, C.Ansikten, C.Kontakt - 0.35, 0.4);
  const koOp = win(T, C.Kontakt, TOTAL - 0.45, 0.4);

  const ALL = GUESTS.concat(DINING, KITCHEN, SUPPORT);
  const rigPose = walk((T * 0.55) % 1, 1);
  const RIG_FACES = ['artigt', 'glad', 'stressad', 'förvånad', 'irriterad', 'nöjd'];
  const rigFace = RIG_FACES[Math.floor(((T - (C.Rigg || 0)) / 0.72) % RIG_FACES.length + RIG_FACES.length) % RIG_FACES.length];

  const section = (() => {
    const names = ['Rigg', 'Aldrar', 'Gaster', 'Gester', 'Matsal', 'Kok', 'Mimik', 'Ansikten', 'Kontakt'];
    let n = 1;
    names.forEach((k, i) => { if (T >= (C[k] || 0) - 0.001) n = i + 1; });
    return n;
  })();

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, overflow: 'hidden' }} data-screen-label={`Reel T+${T.toFixed(1)}s`}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ display: 'block' }}>
        <Floor opacity={floorOp} />

        {/* 01 RIGGEN */}
        {rigOp > 0.004 && <g opacity={rigOp}>
          <line x1={200} y1={940} x2={940} y2={940} stroke={INK} strokeWidth={4} />
          <Figure x={560} y={940} scale={2.05} color="#33383f" hat="toque" apron belt prop="tray" face="artigt"
                  headBack="crop" hair={0} skin={SKIN[3]} pose={rigPose} t={T} phase={0.4} />
          <g opacity={rigCall(0)}>
            <rect x={1516} y={170} width={312} height={330} fill={PANEL} stroke={INK} strokeWidth={4} />
            <g transform="translate(1639,422) scale(3.8)">
              <Head hw={30} hh={34} skin={SKIN[3]} headBack="crop" hair={0} hat="toque"
                    face={rigFace} t={T} phase={0.4} tilt={0} />
            </g>
            <text x={1516} y={540} fill={ACCENT} fontFamily={HEAD_F} fontWeight={800} fontSize={22} letterSpacing="0.1em">{rigFace.toUpperCase()}</text>
            <text x={1516} y={570} fill={INK} fontFamily={HEAD_F} fontWeight={400} fontSize={19} opacity={0.75}>bryn, två ögon, mun</text>
            <text x={1516} y={594} fill={INK} fontFamily={HEAD_F} fontWeight={400} fontSize={19} opacity={0.75}>plus blink och huvudrörelse</text>
          </g>
          {[[330, 'Huvud — bryn, ögon, mun, blink', 630],
            [452, 'Axel → armbåge → hand, med prop', 660],
            [560, 'Bål — uniformsfärg, förkläde, bälte', 640],
            [700, 'Höft → knä → fot, gångcykeln', 640],
            [900, 'Markkontakt — fötterna landar på linjen', 700]].map((c, i) => (
            <g key={c[1]} opacity={rigCall(i)}>
              <line x1={c[2]} y1={c[0]} x2={1000} y2={c[0]} stroke={ACCENT} strokeWidth={3} />
              <text x={1018} y={c[0] + 9} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={21}>{c[1]}</text>
            </g>
          ))}
        </g>}

        {/* 02 ÅLDRAR */}
        {aOp > 0.004 && <g opacity={aOp}>
          <text x={150} y={250} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={30} letterSpacing="0.14em">TRE TAL BÄR ÅLDER OCH KROPP — HÖJD, BREDD, STEGAMPLITUD</text>
          <line x1={150} y1={800} x2={1780} y2={800} stroke={INK} strokeWidth={4} />
          {AGES.map((a, i) => {
            const cx = 300 + i * 340;
            const at = C.Aldrar + 0.2 + i * 0.2;
            const op = enter(0, 1, at, at + 0.4)(T);
            const t = T + i * 2.3;
            const pose = a.wheels
              ? sit({ hipDrop: 0.17, armNear: [60, 40] })
              : (a.amp === 0 ? stand(t, 1) : Object.assign(walk((t * a.hz * 0.5) % 1, a.amp), a.lean ? { lean: a.lean } : {}));
            return (
              <g key={a.label} opacity={op}>
                <Figure x={cx} y={800} scale={1.35} color="#7f7a6d" height={a.height} girth={a.girth}
                        headBack={a.headBack} hair={a.hair} skin={SKIN[a.skin]} prop={a.prop} face={a.face}
                        pose={pose} wheels={a.wheels} t={t} phase={i * 0.71} />
                {showFaces && <Portrait x={cx - 58} y={296} scale={0.78} expression={a.face} skin={SKIN[a.skin]} />}
                <text x={cx - 130} y={852} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={24} letterSpacing="0.1em">{a.label.toUpperCase()}</text>
                <text x={cx - 130} y={884} fill={ACCENT} fontFamily={HEAD_F} fontWeight={800} fontSize={21}>{a.years} · {a.speed} m/s</text>
                <text x={cx - 130} y={916} fill={INK} fontFamily={HEAD_F} fontWeight={400} fontSize={19} opacity={0.75}>h {a.height.toFixed(2)} · b {a.girth.toFixed(2)} · amp {a.amp.toFixed(2)}</text>
              </g>
            );
          })}
        </g>}

        {/* 03 GÄSTER */}
        {gOp > 0.004 && <g opacity={gOp}>
          <text x={150} y={240} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={30} letterSpacing="0.14em">TOLV GÄSTTYPER — ÅLDER, KROPP, KLÄDSEL, HÅR, HUDTON</text>
          {GUESTS.map((g, i) => {
            const col = i % 6, row = Math.floor(i / 6);
            const cx = 250 + col * 288, cy = 520 + row * 356;
            const at = C.Gaster + 0.15 + i * 0.1;
            const op = enter(0, 1, at, at + 0.35)(T);
            const t = T + i * 1.9;
            return (
              <g key={g.label} opacity={op}>
                <line x1={cx - 116} y1={cy} x2={cx + 110} y2={cy} stroke={INK} strokeWidth={3} opacity={0.25} />
                {g.label !== 'Senior' && <Table x={cx + 44} y={cy - 108} w={110} u={44} />}
                {g.label !== 'Senior' && !g.wheels && <Chair cx={cx} cy={cy} h={300 * g.height * 0.9} u={34} />}
                <Figure x={cx} y={cy} scale={0.9} color={g.color} height={g.height} girth={g.girth}
                        hat={g.hat} headBack={g.headBack} hair={g.hair} skin={SKIN[g.skin]} prop={g.prop}
                        face={g.face} pose={g.pose(t)} wheels={g.wheels} t={t} phase={i * 0.63} />
                <text x={cx - 116} y={cy + 40} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={19} letterSpacing="0.07em">{g.label.toUpperCase()}</text>
              </g>
            );
          })}
        </g>}

        {/* 04 GESTER */}
        {geOp > 0.004 && <g opacity={geOp}>
          <text x={150} y={230} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={30} letterSpacing="0.14em">NIO GÄSTGESTER — ARMEN BÄR BETYDELSEN</text>
          {GESTURES.map((g, i) => {
            const col = i % 3, row = Math.floor(i / 3);
            const cx = 384 + col * 552, cy = 424 + row * 238;
            const at = C.Gester + 0.12 + i * 0.11;
            const op = enter(0, 1, at, at + 0.35)(T);
            return (
              <g key={g.label} opacity={op}>
                <line x1={cx - 130} y1={cy} x2={cx + 138} y2={cy} stroke={INK} strokeWidth={3} opacity={0.25} />
                <Table x={cx + 34} y={cy - 74} w={94} u={31} />
                <Chair cx={cx} cy={cy} h={180} u={22} />
                <Figure x={cx} y={cy} scale={0.6} color="#82786b" headBack={g.headBack} hair={g.hair}
                        skin={SKIN[g.skin]} prop={g.prop} face={g.face} pose={g.pose(T)} t={T} phase={i * 0.57} />
                <text x={cx - 130} y={cy + 36} fill={ACCENT} fontFamily={HEAD_F} fontWeight={800} fontSize={18} letterSpacing="0.1em">{String(i + 1).padStart(2, '0')}</text>
                <text x={cx - 94} y={cy + 36} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={18} letterSpacing="0.07em">{g.label.toUpperCase()}</text>
                <text x={cx - 130} y={cy + 60} fill={INK} fontFamily={HEAD_F} fontWeight={400} fontSize={16} opacity={0.75}>{g.note}</text>
              </g>
            );
          })}
        </g>}

        {/* 05 MATSAL */}
        {mOp > 0.004 && <g opacity={mOp}>
          <text x={150} y={250} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={30} letterSpacing="0.14em">MATSALEN — ÅTTA ROLLER, ÅTTA TEMPON</text>
          <RoleGrid list={DINING} T={T} cue={C.Matsal} cols={4} x0={330} dx={420} y0={560} dy={352} scale={0.76} ground />
        </g>}

        {/* 06 KÖK */}
        {kOp > 0.004 && <g opacity={kOp}>
          <text x={150} y={250} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={30} letterSpacing="0.14em">KÖKET — ÅTTA STATIONER, NÄSTAN INGEN FÖRFLYTTNING</text>
          <RoleGrid list={KITCHEN} T={T} cue={C.Kok} cols={4} x0={330} dx={420} y0={560} dy={352} scale={0.76} ground />
          <Counter y={446} label="Kall linje" />
          <Counter y={798} label="Varm linje" />
        </g>}

        {/* 07 MIMIK */}
        {miOp > 0.004 && <g opacity={miOp}>
          <text x={190} y={230} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={30} letterSpacing="0.14em">SEXTON UTTRYCK — VEM, NÄR, OCH HUR DET SER UT</text>
          {MIMIK.map(([exp, role, state], i) => {
            const col = i % 8, row = Math.floor(i / 8);
            const cx = 190 + col * 215, cy = 300 + row * 340;
            const at = C.Mimik + 0.1 + i * 0.07;
            const op = enter(0, 1, at, at + 0.3)(T);
            const rise = pop(28, 0, at, at + 0.55)(T);
            return (
              <g key={role + state} opacity={op} transform={`translate(0,${rise})`}>
                <Portrait x={cx} y={cy} scale={1.05} expression={exp} skin={SKIN[i % 6]} />
                <text x={cx} y={cy + 176} fill={ACCENT} fontFamily={HEAD_F} fontWeight={800} fontSize={16} letterSpacing="0.04em">{exp.toUpperCase()}</text>
                <text x={cx} y={cy + 204} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={17} letterSpacing="0.06em">{role.toUpperCase()}</text>
                <text x={cx} y={cy + 228} fill={INK} fontFamily={HEAD_F} fontWeight={400} fontSize={16} opacity={0.75}>{state}</text>
              </g>
            );
          })}
        </g>}

        {/* 08 ANSIKTSRADEN */}
        {anOp > 0.004 && <g opacity={anOp}>
          <rect x={160} y={430} width={1600} height={4} fill={INK} />
          <rect x={160} y={434} width={1600} height={220} fill={PANEL} />
          <rect x={160} y={654} width={1600} height={4} fill={INK} />
          {[['Hovmästare', 'artigt', 'tar emot vid dörren', false, 2], ['Servitör', 'stressad', 'sex tallrikar', true, 4],
            ['Kock', 'fokuserad', 'i linjen', false, 4], ['Diskare', 'utmattad', 'kön når taket', true, 3],
            ['Lärling', 'generad', 'tappade glaset', false, 5], ['Sommelier', 'stolt', 'rätt flaska', false, 0]].map((r, i) => {
            const at = C.Ansikten + 0.2 + i * 0.14;
            const op = enter(0, 1, at, at + 0.35)(T);
            const x = 200 + i * 266;
            return (
              <g key={r[0]} opacity={op}>
                <g transform={`translate(${x},468) scale(0.86)`}>
                  <rect x={-4} y={-4} width={126} height={140} fill="none" stroke={r[3] ? ACCENT : INK} strokeWidth={5} />
                </g>
                <Portrait x={x} y={468} scale={0.86} expression={r[1]} skin={SKIN[r[4]]} />
                <text x={x} y={608} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={20} letterSpacing="0.1em">{r[0].toUpperCase()}</text>
                <text x={x} y={636} fill={INK} fontFamily={HEAD_F} fontWeight={400} fontSize={18} opacity={0.75}>{r[2]}</text>
              </g>
            );
          })}
          <text x={160} y={396} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={28} letterSpacing="0.14em">ANSIKTSRADEN — DÄR SPELAREN LÄSER SITT EGET OMDÖME</text>
        </g>}

        {/* 09 KONTAKTARK */}
        {koOp > 0.004 && <g opacity={koOp}>
          <text x={150} y={218} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={30} letterSpacing="0.14em">TOLV GÄSTER · TJUGO ROLLER · EN RIGG</text>
          {ALL.map((f, i) => {
            const col = i % 8, row = Math.floor(i / 8);
            const cx = 220 + col * 215, cy = 354 + row * 190;
            const at = C.Kontakt + 0.08 + i * 0.03;
            const op = enter(0, 1, at, at + 0.28)(T);
            const isGuest = i < GUESTS.length;
            return (
              <g key={f.label + i} opacity={op}>
                <line x1={cx - 84} y1={cy} x2={cx + 78} y2={cy} stroke={INK} strokeWidth={2} opacity={0.22} />
                <Figure x={cx} y={cy} color={f.color} height={f.height} girth={f.girth}
                        hat={f.hat} headBack={f.headBack} hair={f.hair} skin={SKIN[f.skin == null ? 2 : f.skin]}
                        apron={f.apron} belt={f.belt} prop={f.prop} face={f.face} wheels={f.wheels} scale={0.42}
                        pose={f.wheels ? sit({ hipDrop: 0.17, armNear: [60, 40] }) : stand(T + i * 0.9, 1.5)} t={T} phase={i * 0.41} />
                <text x={cx - 84} y={cy + 28} fill={isGuest ? ACCENT : INK} fontFamily={HEAD_F} fontWeight={800} fontSize={15} letterSpacing="0.05em">{f.label.toUpperCase()}</text>
              </g>
            );
          })}
        </g>}
      </svg>

      <div style={{ position: 'absolute', left: 80, right: 80, top: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 12, borderBottom: `4px solid ${INK}` }}>
        <Kicker>Nexus Studio · Vinbaren — hela ensemblen i helkropp</Kicker>
        <Kicker color={ACCENT}>{`Ledad rigg · T+${T.toFixed(1)}s`}</Kicker>
      </div>
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 54, height: 4, background: INK }} />
      <div style={{ position: 'absolute', right: 80, bottom: 72, font: `800 20px ${HEAD_F}`, letterSpacing: '0.16em', color: INK }}>
        {`${String(section).padStart(2, '0')} / 09`}
      </div>

      <Captions
        style={{ left: 84, right: 'auto', bottom: 72, textAlign: 'left', font: `800 28px ${HEAD_F}`, color: INK, letterSpacing: '0.14em', textTransform: 'uppercase', textShadow: 'none' }}
        items={[
          { at: 0.2, text: 'Riggen — led för led', until: 4.6 },
          { at: 5.3, text: 'Ålder och kropp' },
          { at: 12.3, text: 'Tolv gästtyper' },
          { at: 21.3, text: 'Nio gästgester' },
          { at: 29.3, text: 'Matsalen' },
          { at: 37.3, text: 'Köket' },
          { at: 45.3, text: 'Sexton uttryck' },
          { at: 53.3, text: 'Ansiktsraden' },
          { at: 59.3, text: 'Kontaktark', until: 64.6 },
        ]}
      />

      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 940, background: ACCENT,
                    transform: `translateX(${drift([[0, 0], [1.9, 0], [2.9, -1040], [TOTAL - 0.7, -1040], [TOTAL, 0]])(T)}px)`,
                    padding: '0 72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
        <div style={{ font: `800 116px ${HEAD_F}`, color: BG, letterSpacing: '-0.04em', lineHeight: 0.88 }}>HELA<br />ENSEMBLEN</div>
        <div style={{ height: 5, background: BG, width: 320 }} />
        <div style={{ font: `800 24px ${HEAD_F}`, color: BG, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Helkropp · gäster · matsal · kök</div>
      </div>
    </div>
  );
}

function StaffGuestReel() {
  const [tw, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
      <CompositionStage width={1920} height={1080} bg={BG} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <Piece tw={tw} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Reel" />
        <TweakToggle label="Porträtt i rutan" value={tw.showFaces} onChange={(v) => setTweak('showFaces', v)} />
        <TweakSection label="Redigering" />
        <TweakToggle label="Motion editor" value={tw.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}

window.StaffGuestReel = StaffGuestReel;
