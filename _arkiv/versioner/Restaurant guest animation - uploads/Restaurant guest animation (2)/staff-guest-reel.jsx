// staff-guest-reel.jsx — Nexus Studio: rörelse, gester och mimik för gäster och personal.
// Continuous composition in the game's own camera angle (3/4 top-down).

const { CompositionStage, useComposition, Captions, Easing, interpolate, animate } = window;
const { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakRadio } = window;

const INK = '#201e1d';
const BG = '#f3f2f2';
const PANEL = '#eae9e9';
const ACCENT = '#ec3013';
const LINE = '#d5d2d1';
const SKIN = '#c8b39a';
const LINEN = '#ddd8d0';
const WOOD = '#8b8477';
const HEAD_F = 'Archivo, system-ui, sans-serif';

const enter = (from, to, a, b) => animate({ from, to, start: a, end: b, ease: Easing.easeOutCubic });
const pop = (from, to, a, b) => animate({ from, to, start: a, end: b, ease: Easing.easeOutBack });
const drift = (kfs) => interpolate(kfs.map((k) => k[0]), kfs.map((k) => k[1]), Easing.easeInOutSine);
const win = (T, a, b, f = 0.3) => enter(0, 1, a, a + f)(T) * (1 - enter(0, 1, b, b + f)(T));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ---------------- figure ---------------- */

function Hat({ kind }) {
  if (kind === 'toque') return <g><rect x={-12} y={-103} width={24} height={20} fill="#efeeed" stroke={INK} strokeWidth={2.5} /><rect x={-14} y={-88} width={28} height={9} fill="#efeeed" stroke={INK} strokeWidth={2.5} /></g>;
  if (kind === 'cap') return <g><rect x={-13} y={-93} width={26} height={9} fill={ACCENT} /><rect x={12} y={-91} width={16} height={5} fill={ACCENT} /></g>;
  if (kind === 'kerchief') return <rect x={-13} y={-93} width={26} height={9} fill={ACCENT} />;
  if (kind === 'visor') return <g><rect x={-13} y={-92} width={26} height={5} fill={INK} /><rect x={11} y={-88} width={15} height={4} fill={INK} /></g>;
  if (kind === 'bun') return <g><rect x={-13} y={-93} width={26} height={8} fill={INK} /><circle cx={-19} cy={-86} r={7} fill={INK} /></g>;
  if (kind === 'hair') return <rect x={-13} y={-93} width={26} height={9} fill="#5d4a3a" />;
  return null;
}

function Prop({ kind }) {
  if (kind === 'tray') return <g><ellipse cx={0} cy={0} rx={21} ry={7} fill="#efeeed" stroke={INK} strokeWidth={3} /><rect x={-6} y={-9} width={12} height={9} fill={ACCENT} /></g>;
  if (kind === 'stack') return <g><rect x={-17} y={-2} width={34} height={5} fill={INK} /><rect x={-17} y={-9} width={34} height={5} fill={INK} /><rect x={-17} y={-16} width={34} height={5} fill={ACCENT} /></g>;
  if (kind === 'pan') return <g><ellipse cx={0} cy={0} rx={17} ry={6} fill={INK} /><rect x={15} y={-2} width={19} height={4} fill={INK} /></g>;
  if (kind === 'shaker') return <g><rect x={-8} y={-6} width={16} height={28} fill={ACCENT} /><rect x={-10} y={-11} width={20} height={5} fill={INK} /></g>;
  if (kind === 'mop') return <g><rect x={-2} y={0} width={4} height={44} fill={INK} /><ellipse cx={0} cy={46} rx={18} ry={6} fill={ACCENT} /></g>;
  if (kind === 'glass') return <rect x={-6} y={-21} width={13} height={21} fill="#efeeed" stroke={INK} strokeWidth={3} />;
  if (kind === 'pad') return <g><rect x={-11} y={-27} width={23} height={28} fill="#efeeed" stroke={INK} strokeWidth={3} /><rect x={-11} y={-27} width={23} height={6} fill={ACCENT} /></g>;
  if (kind === 'crate') return <g><rect x={-19} y={-27} width={38} height={27} fill="#a08a6c" stroke={INK} strokeWidth={3} /><rect x={-19} y={-15} width={38} height={4} fill={INK} /></g>;
  if (kind === 'cup') return <g><rect x={-9} y={-14} width={18} height={14} fill="#efeeed" stroke={INK} strokeWidth={3} /><rect x={10} y={-11} width={8} height={8} fill="none" stroke={INK} strokeWidth={3} /></g>;
  if (kind === 'towel') return <rect x={-12} y={-16} width={25} height={16} fill="#efeeed" stroke={INK} strokeWidth={3} />;
  if (kind === 'menu') return <g><rect x={-12} y={-30} width={25} height={31} fill="#efeeed" stroke={INK} strokeWidth={3} /><rect x={-12} y={-30} width={25} height={7} fill={ACCENT} /></g>;
  if (kind === 'phone') return <rect x={-7} y={-15} width={14} height={22} fill={INK} />;
  if (kind === 'plate') return <ellipse cx={0} cy={0} rx={17} ry={6} fill="#efeeed" stroke={INK} strokeWidth={3} />;
  return null;
}

function Puck(p) {
  const s = p.scale == null ? 1 : p.scale;
  const arm = p.arm || null;
  const bodyTop = `color-mix(in srgb, ${p.color} 76%, #ffffff)`;
  return (
    <g transform={`translate(${p.x},${p.y}) scale(${s})`} opacity={p.opacity == null ? 1 : p.opacity}>
      <ellipse cx={0} cy={0} rx={35} ry={12} fill="rgba(32,30,29,0.16)" />
      <g transform={`translate(0,${p.bob || 0}) rotate(${p.lean || 0})`}>
        <ellipse cx={0} cy={-3} rx={21} ry={8} fill={p.color} />
        <rect x={-21} y={-58} width={42} height={55} fill={p.color} />
        {p.apron && <g><rect x={-19} y={-31} width={38} height={31} fill={LINEN} /><rect x={-19} y={-33} width={38} height={4} fill="#b3aca2" /></g>}
        {p.belt && <rect x={-21} y={-24} width={42} height={5} fill={ACCENT} />}
        <ellipse cx={0} cy={-58} rx={21} ry={8} fill={bodyTop} />
        <g transform={`translate(0,-58) rotate(${p.wedge || 0})`}>
          <polygon points="8,-7 29,0 8,7" fill={ACCENT} stroke={INK} strokeWidth={1.5} />
        </g>
        <circle cx={0} cy={-72} r={13} fill={SKIN} />
        <Hat kind={p.hat} />
        {arm && (
          <g transform={`translate(0,-46) rotate(${arm.angle})`}>
            <rect x={0} y={-3} width={arm.len} height={6} fill={p.color} />
            <g transform={`translate(${arm.len},0) rotate(${-arm.angle})`}>
              <Prop kind={p.prop} />
            </g>
          </g>
        )}
        {!arm && p.prop && <g transform={`translate(26,-40)`}><Prop kind={p.prop} /></g>}
        {p.alert && <rect x={-7} y={-118} width={14} height={14} fill={ACCENT} />}
      </g>
    </g>
  );
}

/* ---------------- faces ---------------- */

const FACES = {
  neutral:       [34, 34, 0, 0, 52, 52, 16, 16, 'line', 42, 0],
  glad:          [30, 30, -8, 8, 52, 52, 10, 10, 'smile', 0, 0],
  artigt:        [32, 32, 0, 0, 52, 52, 8, 8, 'line', 46, -5],
  fokuserad:     [36, 36, 9, -9, 54, 54, 12, 12, 'line', 30, 0],
  stressad:      [30, 30, 14, -14, 52, 52, 18, 18, 'box', 34, 0, 'drop'],
  irriterad:     [40, 40, 18, -18, 58, 58, 9, 9, 'line', 46, 6],
  utmattad:      [40, 40, -6, 6, 58, 58, 5, 5, 'line', 40, 0],
  förvirrad:     [28, 36, -16, 0, 52, 54, 14, 11, 'box', 22, 0],
  förvånad:      [24, 24, 0, 0, 46, 46, 20, 20, 'o', 0, 0],
  stolt:         [32, 32, -6, 6, 54, 54, 9, 9, 'smile', 0, 0, 'badge'],
  förväntansfull:[26, 26, -10, 10, 48, 48, 16, 16, 'smile', 0, 0],
  nöjd:          [34, 34, -4, 4, 56, 56, 7, 7, 'smile', 0, 0],
  otålig:        [38, 32, 16, -8, 56, 54, 10, 13, 'line', 38, 8],
  besviken:      [42, 42, -14, 14, 58, 58, 8, 8, 'line', 44, 9],
  imponerad:     [24, 24, -4, 4, 48, 48, 18, 18, 'o', 0, 0],
};

function Face({ x, y, scale, expression, opacity }) {
  const f = FACES[expression] || FACES.neutral;
  const [bl, br, rl, rr, el, er, hl, hr, mouth, mw, mrot, badge] = f;
  const s = scale == null ? 1 : scale;
  const W = 118, H = 132;
  const brow = (side, top, rot) => (
    <g transform={`translate(${side === 'l' ? 21 + 8 : W - 21 - 8},${top + 2}) rotate(${rot})`}>
      <rect x={-8} y={-2} width={16} height={5} fill={INK} />
    </g>
  );
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} opacity={opacity == null ? 1 : opacity}>
      <rect x={0} y={0} width={W} height={H} fill={SKIN} stroke={INK} strokeWidth={4} />
      {brow('l', bl, rl)}
      {brow('r', br, rr)}
      <rect x={24} y={el} width={12} height={hl} fill={INK} />
      <rect x={W - 36} y={er} width={12} height={hr} fill={INK} />
      {mouth === 'line' && <g transform={`translate(${W / 2},${H - 30}) rotate(${mrot})`}><rect x={-mw / 2} y={-2} width={mw} height={5} fill={INK} /></g>}
      {mouth === 'smile' && <path d={`M 28 ${H - 44} L 28 ${H - 32} L ${W - 28} ${H - 32} L ${W - 28} ${H - 44}`} fill="none" stroke={INK} strokeWidth={5} />}
      {mouth === 'box' && <rect x={(W - mw) / 2} y={H - 38} width={mw} height={16} fill="none" stroke={INK} strokeWidth={5} />}
      {mouth === 'o' && <rect x={W / 2 - 12} y={H - 42} width={24} height={22} fill={INK} />}
      {badge === 'drop' && <rect x={W - 19} y={20} width={9} height={16} fill={ACCENT} />}
      {badge === 'badge' && <rect x={6} y={H - 26} width={14} height={14} fill={ACCENT} />}
    </g>
  );
}

/* ---------------- floor ---------------- */

function Floor({ opacity }) {
  const lines = [];
  for (let i = -14; i <= 26; i++) {
    lines.push(<line key={`a${i}`} x1={i * 120 - 400} y1={0} x2={i * 120 + 500} y2={1080} stroke={LINE} strokeWidth={2} />);
    lines.push(<line key={`b${i}`} x1={i * 120 + 500} y1={0} x2={i * 120 - 400} y2={1080} stroke={LINE} strokeWidth={2} />);
  }
  return <g opacity={opacity}>{lines}</g>;
}

/* ---------------- data ---------------- */

const GUESTS = [
  { label: 'Ensam gäst', color: '#8f8272', hat: 'hair', prop: 'menu', face: 'förväntansfull' },
  { label: 'Par', color: '#7f7a6d', hat: 'none', prop: 'glass', face: 'nöjd' },
  { label: 'Familj', color: '#8a8070', hat: 'cap', prop: 'plate', face: 'glad' },
  { label: 'Sällskap', color: '#7a7168', hat: 'bun', prop: 'glass', face: 'imponerad' },
  { label: 'Stamgäst', color: '#87796a', hat: 'hair', prop: 'glass', face: 'nöjd' },
  { label: 'Kritiker', color: '#6f6a60', hat: 'none', prop: 'phone', face: 'otålig' },
];

const GESTURES = [
  { label: 'Vinkar på servitör', note: 'arm 150°, svep ±16°, 2 Hz', prop: 'none', face: 'otålig', arm: (t) => ({ angle: -150 + 16 * Math.sin(t * 9), len: 46 }) },
  { label: 'Läser menyn', note: 'arm 26°, huvudet lutar 6°', prop: 'menu', face: 'förväntansfull', arm: (t) => ({ angle: -24 + 3 * Math.sin(t * 1.6), len: 34 }) },
  { label: 'Skålar', note: 'lyft 0,18 m, håll 0,6 s', prop: 'glass', face: 'glad', arm: (t) => ({ angle: -70 - 22 * clamp01(Math.sin(t * 2.2)), len: 40 }) },
  { label: 'Kollar klockan', note: 'arm in mot bröstet, 1 s', prop: 'none', face: 'otålig', arm: (t) => ({ angle: -110 + 30 * clamp01(Math.sin(t * 1.5)), len: 30 }) },
  { label: 'Klagar', note: 'pekar på tallriken, 3 stötar', prop: 'plate', face: 'besviken', arm: (t) => ({ angle: -18 + 12 * Math.sin(t * 7), len: 44 }) },
  { label: 'Fotograferar maten', note: 'arm 95°, still i 1,2 s', prop: 'phone', face: 'imponerad', arm: (t) => ({ angle: -96 + 4 * Math.sin(t * 1.1), len: 38 }) },
];

const STAFF = [
  { label: 'Hovmästare', color: '#2a2f3a', hat: 'none', belt: true, prop: 'pad', face: 'artigt', speed: '1,0', arm: (t) => ({ angle: -28 + 8 * Math.sin(t * 1.4), len: 34 }), path: (t) => [40 * Math.sin(t * 0.7), 0], bob: (t) => 2 * Math.sin(t * 2.2) },
  { label: 'Servitör', color: '#33383f', hat: 'none', belt: true, prop: 'tray', face: 'artigt', speed: '1,4', arm: () => ({ angle: -24, len: 40 }), path: (t) => [70 * Math.sin(t * 1.1), 0], bob: (t) => 4 * Math.sin(t * 10) },
  { label: 'Bussare', color: '#4a4744', hat: 'kerchief', apron: true, prop: 'stack', face: 'fokuserad', speed: '1,3', arm: (t) => ({ angle: -26 - 6 * Math.sin(t * 3), len: 36 }), path: (t) => [62 * Math.sin(t * 1.0 + 1), 0], bob: (t) => 4 * Math.sin(t * 9) },
  { label: 'Kökschef', color: '#3d3835', hat: 'toque', apron: true, prop: 'pad', face: 'neutral', speed: '0,6', arm: (t) => ({ angle: -18 + 26 * clamp01(Math.sin(t * 1.1)), len: 38 }), path: (t) => [26 * Math.sin(t * 0.6), 0], bob: (t) => 1.5 * Math.sin(t * 1.8) },
  { label: 'Kock', color: '#3d3835', hat: 'toque', apron: true, prop: 'pan', face: 'fokuserad', speed: '0,4', arm: (t) => ({ angle: -20 + 10 * Math.sin(t * 3.2), len: 34 }), path: (t) => [14 * Math.sin(t * 1.2), 0], bob: (t) => 3 * Math.sin(t * 6.4) },
  { label: 'Diskare', color: '#4a4744', hat: 'kerchief', apron: true, prop: 'towel', face: 'utmattad', speed: '0,2', alert: true, arm: (t) => ({ angle: -16 + 16 * Math.sin(t * 10), len: 32 }), path: (t) => [5 * Math.sin(t * 4), 0], bob: (t) => 3 * Math.sin(t * 10) },
  { label: 'Bartender', color: '#2a2f3a', hat: 'none', apron: true, prop: 'shaker', face: 'stolt', speed: '0,5', arm: (t) => ({ angle: -62 + 20 * Math.sin(t * 7), len: 32 }), path: () => [0, 0], bob: (t) => 2 * Math.sin(t * 7) },
  { label: 'Barista', color: '#2a2f3a', hat: 'visor', apron: true, prop: 'cup', face: 'fokuserad', speed: '0,4', arm: (t) => ({ angle: -30 + 14 * clamp01(Math.sin(t * 2)), len: 32 }), path: () => [0, 0], bob: (t) => 4 * clamp01(Math.sin(t * 2)) },
  { label: 'Chef', color: '#33383f', hat: 'bun', prop: 'pad', face: 'neutral', speed: '1,1', arm: (t) => ({ angle: -26 + 10 * Math.sin(t * 1.2), len: 34 }), path: (t) => [58 * Math.sin(t * 0.85), 0], bob: (t) => 3 * Math.sin(t * 8) },
  { label: 'Städare', color: '#4a4744', hat: 'cap', prop: 'mop', face: 'neutral', speed: '1,0', arm: (t) => ({ angle: -12 + 18 * Math.sin(t * 2.4), len: 30 }), path: (t) => [54 * Math.sin(t * 0.9), 8 * Math.sin(t * 1.8)], bob: (t) => 2 * Math.sin(t * 5) },
  { label: 'Utkörare', color: '#4a4744', hat: 'cap', prop: 'crate', face: 'stressad', speed: '1,6', lean: 6, arm: () => ({ angle: -30, len: 32 }), path: (t) => [76 * Math.sin(t * 1.5), 0], bob: (t) => 6 * Math.sin(t * 13) },
  { label: 'Lärling', color: '#4a4744', hat: 'none', apron: true, prop: 'glass', face: 'förvirrad', speed: '1,1', arm: (t) => ({ angle: -30 + 12 * Math.sin(t * 1.3), len: 32 }), path: (t) => [44 * Math.sin(t * 0.8) + 8 * Math.sin(t * 3), 0], bob: (t) => 3 * Math.sin(t * 7) },
];

/* ---------------- chrome ---------------- */

const Kicker = ({ children, color, size }) => (
  <div style={{ font: `800 ${size || 20}px ${HEAD_F}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: color || INK }}>{children}</div>
);

function Label({ x, y, id, text, note, op }) {
  return (
    <g opacity={op}>
      <text x={x} y={y} fill={ACCENT} fontFamily={HEAD_F} fontWeight={800} fontSize={20} letterSpacing="0.12em">{id}</text>
      <text x={x + 46} y={y} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={20} letterSpacing="0.1em">{text}</text>
      {note && <text x={x} y={y + 26} fill={INK} fontFamily={HEAD_F} fontWeight={400} fontSize={17} opacity={0.75}>{note}</text>}
    </g>
  );
}

/* ---------------- the piece ---------------- */

function Piece({ tw }) {
  const { T, CUES: C, authoredTotal: TOTAL } = useComposition();
  const showFaces = tw.showFaces !== false;
  const showWedge = tw.showWedge !== false;

  const floorOp = drift([[0, 1], [C.Mimik - 0.5, 1], [C.Mimik, 0.16], [C.Ansikten, 0.16], [C.Kontakt - 0.4, 1]])(T);

  /* 01 rigg */
  const rigOp = win(T, 0.1, C.Gaster - 0.35, 0.4);
  const rigCall = (i) => enter(0, 1, 2.9 + i * 0.26, 3.4 + i * 0.26)(T);
  const rigWedge = drift([[0, 0], [1.9, 0], [4.6, 320]])(T);

  /* 02 gäster */
  const gOp = win(T, C.Gaster, C.Gester - 0.35, 0.4);

  /* 03 gester */
  const geOp = win(T, C.Gester, C.Personal - 0.35, 0.4);

  /* 04 personal */
  const pOp = win(T, C.Personal, C.Mimik - 0.35, 0.4);

  /* 05 mimik */
  const mOp = win(T, C.Mimik, C.Ansikten - 0.35, 0.4);
  const mimikSet = [
    ['förväntansfull', 'Gäst · anländer'], ['otålig', 'Gäst · väntar'], ['besviken', 'Gäst · fel tallrik'],
    ['nöjd', 'Gäst · betalar'], ['artigt', 'Servitör · vid bordet'], ['stressad', 'Servitör · fyra bord'],
    ['fokuserad', 'Kock · i linjen'], ['utmattad', 'Diskare · timme fem'],
  ];

  /* 06 ansiktsraden */
  const aOp = win(T, C.Ansikten, C.Kontakt - 0.35, 0.4);

  /* 07 kontaktark */
  const kOp = win(T, C.Kontakt, TOTAL - 0.45, 0.4);

  const section = (() => {
    const names = ['Rigg', 'Gaster', 'Gester', 'Personal', 'Mimik', 'Ansikten', 'Kontakt'];
    let n = 1;
    names.forEach((k, i) => { if (T >= (C[k] || 0) - 0.001) n = i + 1; });
    return n;
  })();

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, overflow: 'hidden' }} data-screen-label={`Reel T+${T.toFixed(1)}s`}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ display: 'block' }}>
        <Floor opacity={floorOp} />

        {/* 01 RIGG */}
        <g opacity={rigOp}>
          <Puck x={600} y={900} scale={4.2} color="#33383f" hat="toque" apron belt prop="tray"
                arm={{ angle: 4, len: 40 }} wedge={rigWedge} bob={3 * Math.sin(T * 2)} />
          {[[490, 'Huvudbonad — rollen i silhuett', 660], [660, 'Riktningskil — fri yaw blir läsbar', 740], [722, 'Arm + prop — gesten sitter här', 800], [836, 'Förkläde — kök skiljs från golv', 700]].map((c, i) => (
            <g key={c[1]} opacity={rigCall(i)}>
              <line x1={c[2]} y1={c[0]} x2={1120} y2={c[0]} stroke={ACCENT} strokeWidth={3} />
              <text x={1140} y={c[0] + 9} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={28}>{c[1]}</text>
            </g>
          ))}
        </g>

        {/* 02 GÄSTER */}
        <g opacity={gOp}>
          {GUESTS.map((g, i) => {
            const col = i % 3, row = Math.floor(i / 3);
            const cx = 350 + col * 540, cy = 520 + row * 360;
            const at = C.Gaster + 0.2 + i * 0.16;
            const op = enter(0, 1, at, at + 0.4)(T);
            const rise = pop(40, 0, at, at + 0.7)(T);
            return (
              <g key={g.label} opacity={op} transform={`translate(0,${rise})`}>
                <ellipse cx={cx - 100} cy={cy - 18} rx={58} ry={21} fill="#a99f8d" stroke={INK} strokeWidth={4} />
                <ellipse cx={cx - 100} cy={cy - 22} rx={22} ry={8} fill="#efeeed" stroke={INK} strokeWidth={3} />
                <Puck x={cx} y={cy} scale={1.4} color={g.color} hat={g.hat} prop={g.prop}
                      arm={{ angle: -30 + 8 * Math.sin(T * 1.6 + i), len: 34 }} wedge={showWedge ? 20 : 0}
                      bob={2 * Math.sin(T * 1.4 + i)} />
                {showFaces && <Face x={cx + 78} y={cy - 186} scale={0.82} expression={g.face} />}
                <text x={cx - 158} y={cy + 54} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={24} letterSpacing="0.12em">{g.label.toUpperCase()}</text>
              </g>
            );
          })}
        </g>

        {/* 03 GESTER */}
        <g opacity={geOp}>
          {GESTURES.map((g, i) => {
            const col = i % 3, row = Math.floor(i / 3);
            const cx = 350 + col * 540, cy = 510 + row * 360;
            const at = C.Gester + 0.15 + i * 0.14;
            const op = enter(0, 1, at, at + 0.4)(T);
            const a = g.arm(T);
            return (
              <g key={g.label} opacity={op}>
                <Puck x={cx} y={cy} scale={1.4} color="#82786b" hat={i % 2 ? 'hair' : 'none'} prop={g.prop}
                      arm={a} wedge={showWedge ? 14 : 0} bob={2 * Math.sin(T * 1.5 + i)} />
                {showFaces && <Face x={cx + 96} y={cy - 182} scale={0.76} expression={g.face} />}
                <Label x={cx - 158} y={cy + 54} id={String(i + 1).padStart(2, '0')} text={g.label.toUpperCase()} note={g.note} op={1} />
              </g>
            );
          })}
        </g>

        {/* 04 PERSONAL */}
        <g opacity={pOp}>
          {STAFF.map((s, i) => {
            const col = i % 6, row = Math.floor(i / 6);
            const cx = 230 + col * 292, cy = 452 + row * 384;
            const at = C.Personal + 0.1 + i * 0.1;
            const op = enter(0, 1, at, at + 0.35)(T);
            const [dx, dy] = s.path(T + i);
            return (
              <g key={s.label} opacity={op}>
                <Puck x={cx + dx * 0.5} y={cy + dy} scale={1.2} color={s.color} hat={s.hat} apron={s.apron} belt={s.belt}
                      prop={s.prop} arm={s.arm(T + i)} wedge={showWedge ? (dx > 0 ? 12 : 168) : 0}
                      bob={s.bob(T + i)} lean={s.lean || 0} alert={s.alert} />
                <text x={cx - 104} y={cy + 56} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={20} letterSpacing="0.1em">{s.label.toUpperCase()}</text>
                <text x={cx - 104} y={cy + 84} fill={ACCENT} fontFamily={HEAD_F} fontWeight={800} fontSize={20} letterSpacing="0.06em">{s.speed} m/s</text>
              </g>
            );
          })}
        </g>

        {/* 05 MIMIK */}
        <g opacity={mOp}>
          {mimikSet.map(([exp, cap], i) => {
            const col = i % 4, row = Math.floor(i / 4);
            const cx = 250 + col * 400, cy = 268 + row * 372;
            const at = C.Mimik + 0.15 + i * 0.13;
            const op = enter(0, 1, at, at + 0.35)(T);
            const rise = pop(34, 0, at, at + 0.6)(T);
            return (
              <g key={cap} opacity={op} transform={`translate(0,${rise})`}>
                <Face x={cx} y={cy} scale={1.5} expression={exp} />
                <text x={cx} y={cy + 232} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={21} letterSpacing="0.1em">{cap.toUpperCase()}</text>
              </g>
            );
          })}
        </g>

        {/* 06 ANSIKTSRADEN */}
        <g opacity={aOp}>
          <rect x={160} y={430} width={1600} height={4} fill={INK} />
          <rect x={160} y={434} width={1600} height={220} fill={PANEL} />
          <rect x={160} y={654} width={1600} height={4} fill={INK} />
          {[['Hovmästare', 'artigt', 'tar emot vid dörren', false], ['Servitör', 'stressad', 'fyra bord samtidigt', true], ['Kock', 'fokuserad', 'i linjen', false], ['Diskare', 'utmattad', 'kön når taket', true], ['Lärling', 'förvirrad', 'vet inte var glasen står', false], ['Bartender', 'stolt', 'skakar', false]].map(([role, exp, task, flag], i) => {
            const at = C.Ansikten + 0.2 + i * 0.14;
            const op = enter(0, 1, at, at + 0.35)(T);
            const x = 200 + i * 266;
            return (
              <g key={role} opacity={op}>
                <g transform={`translate(${x},468) scale(0.86)`}>
                  <rect x={-4} y={-4} width={126} height={140} fill="none" stroke={flag ? ACCENT : INK} strokeWidth={5} />
                </g>
                <Face x={x} y={468} scale={0.86} expression={exp} />
                <text x={x} y={608} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={20} letterSpacing="0.1em">{role.toUpperCase()}</text>
                <text x={x} y={636} fill={INK} fontFamily={HEAD_F} fontWeight={400} fontSize={18} opacity={0.75}>{task}</text>
              </g>
            );
          })}
          <text x={160} y={396} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={28} letterSpacing="0.14em">ANSIKTSRADEN — DÄR SPELAREN LÄSER SITT EGET OMDÖME</text>
        </g>

        {/* 07 KONTAKTARK */}
        <g opacity={kOp}>
          {GUESTS.concat(STAFF).map((f, i) => {
            const col = i % 6, row = Math.floor(i / 6);
            const cx = 250 + col * 288, cy = 404 + row * 250;
            const at = C.Kontakt + 0.1 + i * 0.045;
            const op = enter(0, 1, at, at + 0.3)(T);
            const isGuest = i < GUESTS.length;
            return (
              <g key={f.label + i} opacity={op}>
                <Puck x={cx} y={cy} scale={0.86} color={f.color} hat={f.hat} apron={f.apron} belt={f.belt}
                      prop={f.prop} arm={{ angle: -30, len: 32 }} wedge={showWedge ? 12 : 0} bob={2 * Math.sin(T * 2 + i)} />
                {showFaces && <Face x={cx + 52} y={cy - 122} scale={0.52} expression={f.face} />}
                <text x={cx - 96} y={cy + 34} fill={isGuest ? ACCENT : INK} fontFamily={HEAD_F} fontWeight={800} fontSize={17} letterSpacing="0.08em">{f.label.toUpperCase()}</text>
              </g>
            );
          })}
          <text x={154} y={238} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={30} letterSpacing="0.14em">SEX GÄSTTYPER · TOLV ROLLER · SAMMA RIGG</text>
        </g>
      </svg>

      {/* frame furniture */}
      <div style={{ position: 'absolute', left: 80, right: 80, top: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 12, borderBottom: `4px solid ${INK}` }}>
        <Kicker>Nexus Studio · Vinbaren — rörelse, gester, mimik</Kicker>
        <Kicker color={ACCENT}>{`3/4 top-down · T+${T.toFixed(1)}s`}</Kicker>
      </div>
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 54, height: 4, background: INK }} />
      <div style={{ position: 'absolute', right: 80, bottom: 72, font: `800 20px ${HEAD_F}`, letterSpacing: '0.16em', color: INK }}>
        {`${String(section).padStart(2, '0')} / 07`}
      </div>

      <Captions
        style={{ left: 84, right: 'auto', bottom: 72, textAlign: 'left', font: `800 28px ${HEAD_F}`, color: INK, letterSpacing: '0.14em', textTransform: 'uppercase', textShadow: 'none' }}
        items={[
          { at: 0.2, text: 'Riggen — puck+ med arm', until: 4.4 },
          { at: 5.2, text: 'Sex gästtyper' },
          { at: 11.2, text: 'Gester — armen bär betydelsen' },
          { at: 18.4, text: 'Tolv roller, tolv tempon' },
          { at: 27.4, text: 'Mimik i närbild' },
          { at: 34.4, text: 'Ansiktsraden' },
          { at: 40.4, text: 'Kontaktark', until: 45.2 },
        ]}
      />

      {/* title plate — loop seam */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 900, background: ACCENT,
                    transform: `translateX(${drift([[0, 0], [1.9, 0], [2.9, -1000], [TOTAL - 0.7, -1000], [TOTAL, 0]])(T)}px)`,
                    padding: '0 72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
        <div style={{ font: `800 128px ${HEAD_F}`, color: BG, letterSpacing: '-0.04em', lineHeight: 0.88 }}>GÄSTER<br />&amp; PERSONAL</div>
        <div style={{ height: 5, background: BG, width: 320 }} />
        <div style={{ font: `800 26px ${HEAD_F}`, color: BG, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Rörelse · gester · mimik</div>
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
        <TweakToggle label="Mimik i rutan" value={tw.showFaces} onChange={(v) => setTweak('showFaces', v)} />
        <TweakToggle label="Riktningskil" value={tw.showWedge} onChange={(v) => setTweak('showWedge', v)} />
        <TweakSection label="Redigering" />
        <TweakToggle label="Motion editor" value={tw.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}

window.StaffGuestReel = StaffGuestReel;
