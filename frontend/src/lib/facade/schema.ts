// ORDER 056 Del B — parametric facade schema for Swedish wooden houses.
//
// Every field is a discrete choice or a bounded scalar. The combination
// span is small enough to enumerate, deep enough that Grythyttan
// exhibits no two identical facades. Proportions and colour targets
// are derived from the reference photos in the target images.
//
// Colour space: sRGB hex, tone-mapped by ACES in the render pipeline
// (ORDER 054 Del D). Values below are the un-tone-mapped scene-linear
// intent; the final look is what leaves the tone mapper.

export type Kulör    = 'falurod' | 'ockragul' | 'vit' | 'ljusgra';
export type Panel    = 'locklist' | 'staende_lockpanel' | 'liggande_fasspont';
export type Vaningar = 1 | 1.5 | 2;
// Roof pitch in DEGREES from horizontal. Bounded 22..45 — a shallower
// pitch reads industrial (not typical for Bergslag residential), and
// a steeper pitch reads gothic (rare here except on the church).
export type Takvinkel   = number;    // 22..45
export type Taktackning = 'tegel' | 'plat' | 'tjarpapp';
export type Knutar      = 'vit' | 'omalad';
export type Sockel      = 'grasten' | 'puts' | 'ingen';
// Windows per linear metre of facade. Real Bergslag houses cluster
// around 0.20–0.35 wpm for residential (a two-window bay every ~4 m).
// Bounded 0.10..0.50.
export type Fonsterrytm = number;
export type Fonstertyp  = 'korspost' | 'tvaluft' | 'enluft';

export interface FacadeParams {
  kulor: Kulör;
  panel: Panel;
  vaningar: Vaningar;
  takvinkel: Takvinkel;
  taktackning: Taktackning;
  knutar: Knutar;
  sockel: Sockel;
  fonsterrytm: Fonsterrytm;
  fonstertyp: Fonstertyp;
}

// Unit-contract fixtures (ORDER 053 Del B). The generator uses these
// as the geometric truth for wall height, corner-board width, etc.
// Not overridable per-building — the metric ground is not stylistic.
export const VANINGSHOJD_M = 2.70;      // våningshöjd per ORDER 053
export const SOCKELHOJD_M = 0.35;       // sockel height above ground
// ORDER 057 Del C — Swedish eave overhangs cluster around 0.30–0.50 m;
// 0.60 (initial value) read as umbrella-scale on small houses.
export const TAKFOT_M = 0.40;
export const KNUTBRADA_BREDD_M = 0.14;  // corner-board face width
export const KNUTBRADA_DJUP_M = 0.03;   // corner-board relief depth
export const PANELLIST_BREDD_M = 0.05;  // locklist strip width
export const PANELLIST_DJUP_M = 0.015;  // locklist relief depth
export const PANELLIST_AVSTAND_M = 0.18; // c/c spacing between lists

// Window geometry — European standard casement window. Frame and
// jamb dimensions match a real openable window at ~1.2 m sill height.
export const FONSTER_BREDD_M = 0.95;
export const FONSTER_HOJD_M = 1.35;
export const FONSTER_SILL_M = 1.05;     // bottom-of-glass above floor
export const FODER_BREDD_M = 0.10;      // window casing board width
export const FODER_DJUP_M = 0.025;      // window casing relief depth
export const SPROJS_TJOCK_M = 0.025;    // muntin thickness

// Colour palette — anchor values. Actual materials tone via ACES.
export const KULOR_HEX: Record<Kulör, string> = {
  falurod:  '#7c2e24',   // Falu red, same as PlayerBusiness (ORDER 054)
  ockragul: '#c58c3a',   // ochre yellow
  vit:      '#ecead9',   // painted white (off-white, ORDER 054 Del D)
  ljusgra:  '#b3b1a4'    // pale grey
};

export const KNUT_HEX: Record<Knutar, string> = {
  vit:     '#e8e2cf',    // painted white corner-boards
  omalad:  '#6b4e34'     // untreated timber corner-boards
};

export const SOCKEL_HEX: Record<Sockel, string> = {
  grasten: '#5b5449',    // grey stone
  puts:    '#c6b89f',    // plaster / render
  ingen:   '#7c2e24'     // sentinel — never rendered when 'ingen'
};

// Roof cladding colours (ORDER 057 Del C — lifted out of the near-black
// end of the palette so the roofs stop dominating the view):
//   tegel     — warm red-brown clay tile, matt
//   plåt      — dark grey painted steel with a subtle blue cast
//   tjärpapp  — dark grey tar paper; darkest of the three but NOT black
// The ACES tone mapper compresses highlights so anything darker than
// ~#252525 collapses to indistinguishable black on screen — we sit a
// safe distance above that floor for all three.
export const TAKTACKNING_HEX: Record<Taktackning, string> = {
  tegel:    '#8a3d28',
  plat:     '#3e4550',
  tjarpapp: '#33333a'
};

// Window frame + sill.
export const FODER_HEX = '#e8e2cf';   // white painted casing
export const SILL_HEX  = '#e0d8c0';   // slightly cooler white sill
