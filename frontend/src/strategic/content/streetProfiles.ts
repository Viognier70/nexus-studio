// ORDER 031 — Street Profile catalogue.
//
// The core datum for the "recognisability" pass. Every named street
// carries a StreetProfile that other renderers read to decide what
// boundary, ground surface, tree species and density, and slope
// treatment to draw along that street.
//
// Two design commitments:
//
//   1. EVIDENCE, NOT DISTRIBUTION. Every profile field is derived
//      from the Vision Owner Street View archive (documentation/
//      references/grythyttan bilder/) or from OSM data. No random
//      per-building hash, no "generic Swedish palette percentages".
//      Streets with no observation fall back to DEFAULT_PROFILE,
//      documented as such.
//
//   2. NEIGHBOURING PROPERTIES SHARE STYLE. The profile is per
//      street, not per building. Every plot fronting Skolgatan gets
//      the same boundary + surface + tree species; the diversity
//      between plots comes from the buildings themselves, not from
//      randomised infrastructure.
//
// Nothing here has spatial geometry — that is derived at render time
// by the scene components that consume this catalogue.

import { WORLD } from './world';

// ---------------------------------------------------------------- types

export type BoundaryStyle =
  | 'none'
  | 'hedge'
  | 'wooden-fence'
  | 'picket-fence'
  | 'wire-fence'
  | 'stone-wall'
  | 'retaining-wall'
  | 'mixed';

export type SurfaceStyle =
  | 'grass'
  | 'gravel'
  | 'asphalt'
  | 'paving-stones'
  | 'concrete'
  | 'worn-dirt'
  | 'mixed';

export type VegetationDensity = 'none' | 'sparse' | 'moderate' | 'dense' | 'tunnel';

export type CanopyDensity = 'open' | 'framed' | 'tunnel';

export type SlopeCharacter = 'flat' | 'gentle-slope' | 'uphill' | 'bowl' | 'lakeshore';

export type PlotOpenness = 'open' | 'partial' | 'enclosed';

export type TreeSpecies = 'birch' | 'conifer' | 'mixed' | 'ornamental' | 'lime';

export type LightingStyle = 'none' | 'residential-pole' | 'commercial' | 'institutional-bollard';

export type ColourTendency =
  | 'faluröd-dominant'          // majority Falu-red timber (historic core, Kyrkogatan / Torget cluster)
  | 'mixed-warm'                // Faluröd + cream + ochre in balanced mix (village-fringe residentials)
  | 'cream-dominant'            // predominantly cream / pale plaster (Badvägen lakeshore, upper villas)
  | 'institutional-plaster'     // school / care buildings, warm ochre + cool plaster
  | 'industrial-brick'          // Faluröd brick industrial (Nygatan, Swedecote cluster)
  | 'weathered-timber';         // aged red-brown timber (barns, agricultural outbuildings)

export interface StreetProfile {
  /** OSM `name` tag on WORLD.roads. Case-sensitive Swedish spelling. */
  name: string;
  /** Vegetation density on the roadside verge. */
  vegetation: VegetationDensity;
  /** Overhead canopy — trees planted close enough to arch over the road. */
  canopy: CanopyDensity;
  /** Property-boundary style used along this street. */
  boundary: BoundaryStyle;
  /** Ground surface of driveways / yard aprons off this street. */
  surface: SurfaceStyle;
  /** Slope reading — informs retaining-wall placement. */
  slope: SlopeCharacter;
  /** How open the plots feel from the street. */
  plot_openness: PlotOpenness;
  /** Dominant tree species along the roadside verge. */
  tree_species: TreeSpecies;
  /** Tree spacing along the verge in metres (0 = no trees). */
  tree_spacing_m: number;
  /** Lighting style — informs future street-furniture pass. */
  lighting: LightingStyle;
  /** Colour tendency for buildings fronting this street. */
  colour_tendency: ColourTendency;
  /** One-sentence description of what makes this street feel like this
   * street. Used in the catalogue doc. Not read by any renderer. */
  identity: string;
  /** Evidence source: which Vision Owner screenshots (by time) inform
   * this profile. Empty array = default profile, no direct evidence. */
  evidence: string[];
}

// ---------------------------------------------------------------- default

/** Fallback for named streets we have no Street View shot for. */
export const DEFAULT_PROFILE: Omit<StreetProfile, 'name'> = {
  vegetation: 'moderate',
  canopy: 'open',
  boundary: 'mixed',
  surface: 'gravel',
  slope: 'flat',
  plot_openness: 'partial',
  tree_species: 'mixed',
  tree_spacing_m: 24,
  lighting: 'residential-pole',
  colour_tendency: 'mixed-warm',
  identity: 'Village residential street — no direct Vision Owner observation, inherits default mixed-warm village character.',
  evidence: []
};

// ---------------------------------------------------------------- catalogue

// Populated from the four per-corridor surveys (RECOGNISABILITY_SURVEY.md)
// which distilled the 91 Vision Owner screenshots into per-street
// findings. Each entry references the specific screenshot filenames
// that grounded the observation — the survey timestamp is a stable
// identifier for the source view.
//
// Order matches spatial walk-through: village core → main road →
// residential fringes → institutional district → lakeshore →
// peripheral streets.

const CURATED: StreetProfile[] = [
  // ------- Village historic core
  {
    name: 'Kyrkogatan',
    vegetation: 'dense',
    canopy: 'framed',
    boundary: 'wooden-fence',
    surface: 'gravel',
    slope: 'uphill',
    plot_openness: 'enclosed',
    tree_species: 'mixed',
    tree_spacing_m: 12,
    lighting: 'residential-pole',
    colour_tendency: 'faluröd-dominant',
    identity: 'Historic uphill village core. Dense timber walls, Faluröd + white trim dominant, mature trees frame the street. Sloped terrain reveals retaining walls on the uphill side. The multi-gable long-house cluster around Kyrkogatan 8 / 12 anchors identity.',
    evidence: ['16.06.43', '16.06.52', '16.07.01', '16.07.09', '16.07.17', '16.07.30', '16.08.08', '16.08.18', '16.08.33', '16.09.06']
  },
  {
    name: 'Torget',
    vegetation: 'moderate',
    canopy: 'framed',
    boundary: 'none',
    surface: 'paving-stones',
    slope: 'bowl',
    plot_openness: 'open',
    tree_species: 'birch',
    tree_spacing_m: 10,
    lighting: 'commercial',
    colour_tendency: 'faluröd-dominant',
    identity: 'Village plaza. Warm sandy-gravel paved surface (TorgetPlaza), buildings frame the space rather than enclose it, birch alley defines the western edge, gästgivaregård + long-house cluster provide the historic anchors.',
    evidence: ['15.56.59', '15.57.12', '15.57.24', '16.00.08', '16.00.16', '16.00.26', '16.00.38', '16.01.07']
  },
  {
    name: 'Kyrkbacken',
    vegetation: 'dense',
    canopy: 'framed',
    boundary: 'stone-wall',
    surface: 'gravel',
    slope: 'uphill',
    plot_openness: 'enclosed',
    tree_species: 'mixed',
    tree_spacing_m: 10,
    lighting: 'residential-pole',
    colour_tendency: 'faluröd-dominant',
    identity: 'Church corner — sloped short street connecting Torget to the churchyard. Stone / low masonry boundaries typical of ecclesiastical ground, mature vegetation, historic long-house context.',
    evidence: ['16.09.26', '16.09.35']
  },
  // ------- Institutional / school district
  {
    name: 'Skolgatan',
    vegetation: 'dense',
    canopy: 'tunnel',
    boundary: 'hedge',
    surface: 'gravel',
    slope: 'gentle-slope',
    plot_openness: 'partial',
    tree_species: 'birch',
    tree_spacing_m: 8,
    lighting: 'institutional-bollard',
    colour_tendency: 'institutional-plaster',
    identity: 'The birch tree tunnel that defines Grythyttan\'s school approach. Dense overhead canopy, institutional buildings set back behind hedgerows, gentle slope down toward the school complex. Cited by the core survey as the district\'s primary visual signature.',
    evidence: ['16.01.41', '16.01.55', '16.02.04', '16.02.12', '16.02.23', '16.02.33', '16.10.00', '16.10.10']
  },
  {
    name: 'Mässingsslatan',
    vegetation: 'moderate',
    canopy: 'framed',
    boundary: 'wire-fence',
    surface: 'asphalt',
    slope: 'flat',
    plot_openness: 'open',
    tree_species: 'birch',
    tree_spacing_m: 14,
    lighting: 'institutional-bollard',
    colour_tendency: 'institutional-plaster',
    identity: 'School / care campus access. Paved institutional character, low wire fences around sports and playground areas, mature birch shelter belts. Wider verges than a residential street.',
    evidence: ['16.10.38', '16.11.01', '16.11.33', '16.11.42', '16.12.30', '16.12.42', '16.13.59', '16.15.09', '16.15.16', '16.28.28']
  },
  // ------- Commercial main road
  {
    name: 'Prästgatan',
    vegetation: 'sparse',
    canopy: 'open',
    boundary: 'mixed',
    surface: 'asphalt',
    slope: 'gentle-slope',
    plot_openness: 'open',
    tree_species: 'birch',
    tree_spacing_m: 22,
    lighting: 'commercial',
    colour_tendency: 'mixed-warm',
    identity: 'Commercial main street — Rv 244 through-village character. Wider road, larger paved forecourts (INGO fuel forecourt, Pizzans front terrace), mixed apartment / commercial fronts, sparse birch verges, minimal fencing on the commercial frontages.',
    evidence: ['15.57.40', '15.57.54', '15.58.12', '15.58.29', '15.59.26', '15.59.53', '16.00.08']
  },
  {
    name: 'Nygatan',
    vegetation: 'moderate',
    canopy: 'framed',
    boundary: 'hedge',
    surface: 'asphalt',
    slope: 'flat',
    plot_openness: 'partial',
    tree_species: 'birch',
    tree_spacing_m: 18,
    lighting: 'residential-pole',
    colour_tendency: 'industrial-brick',
    identity: 'Mixed light-industrial + residential corridor. The dominant red-brick industrial mass (Grythyttans Glass area) sets the palette; adjacent residential buildings sit behind low hedges. Denser hedging than Prästgatan.',
    evidence: ['16.04.26', '16.04.39', '16.04.54', '16.05.08', '16.05.23', '16.05.36', '16.05.46']
  },
  {
    name: 'Lokavägen',
    vegetation: 'sparse',
    canopy: 'open',
    boundary: 'wire-fence',
    surface: 'asphalt',
    slope: 'flat',
    plot_openness: 'open',
    tree_species: 'conifer',
    tree_spacing_m: 26,
    lighting: 'commercial',
    colour_tendency: 'industrial-brick',
    identity: 'Rv 205 through-village industrial corridor. Slate-industry cluster (Icopal, Takskifferspecialisten, Swedecote) fronts the road. Wire fencing around industrial yards, sparse vegetation, wide carriageway.',
    evidence: ['15.56.25', '15.56.43']
  },
  // ------- Lakeshore residential
  {
    name: 'Badvägen',
    vegetation: 'moderate',
    canopy: 'framed',
    boundary: 'picket-fence',
    surface: 'gravel',
    slope: 'lakeshore',
    plot_openness: 'partial',
    tree_species: 'birch',
    tree_spacing_m: 16,
    lighting: 'residential-pole',
    colour_tendency: 'cream-dominant',
    identity: 'Lakeside villa street. White picket fences at every plot boundary, gravel driveways, cream / pale-yellow rendered villas dominant (not Faluröd), mature birch and conifer backdrop, plots set well back from the road on generous meadow.',
    evidence: ['16.12.06', '16.29.01', '16.29.42', '16.29.52', '16.30.15', '16.30.54', '16.31.03', '16.31.11', '21.13.48']
  },
  // ------- Peripheral residential
  {
    name: 'Härjeredvägen',
    vegetation: 'sparse',
    canopy: 'open',
    boundary: 'mixed',
    surface: 'gravel',
    slope: 'flat',
    plot_openness: 'open',
    tree_species: 'mixed',
    tree_spacing_m: 24,
    lighting: 'residential-pole',
    colour_tendency: 'mixed-warm',
    identity: 'Peripheral residential fringe. Sparse density, isolated villas across meadow with individual driveways. Mixed boundary styles (hedges where mature, none where new plots).',
    evidence: ['16.03.00', '16.03.11', '16.03.28', '16.04.54']
  },
  {
    name: 'Hammargatan',
    vegetation: 'moderate',
    canopy: 'framed',
    boundary: 'hedge',
    surface: 'gravel',
    slope: 'flat',
    plot_openness: 'partial',
    tree_species: 'mixed',
    tree_spacing_m: 22,
    lighting: 'residential-pole',
    colour_tendency: 'mixed-warm',
    identity: 'Mid-density residential street south of Prästgatan. Hedges dominant at boundaries, mixed tree species, moderate setbacks.',
    evidence: []
  },
  {
    name: 'Åsgatan',
    vegetation: 'dense',
    canopy: 'framed',
    boundary: 'hedge',
    surface: 'gravel',
    slope: 'gentle-slope',
    plot_openness: 'enclosed',
    tree_species: 'mixed',
    tree_spacing_m: 12,
    lighting: 'residential-pole',
    colour_tendency: 'mixed-warm',
    identity: 'Åsen neighbourhood residential street, chapel area. Denser vegetation than the commercial spine, hedges at plot boundaries.',
    evidence: []
  },
  {
    name: 'Stentrygatan',
    vegetation: 'moderate',
    canopy: 'framed',
    boundary: 'hedge',
    surface: 'gravel',
    slope: 'gentle-slope',
    plot_openness: 'partial',
    tree_species: 'mixed',
    tree_spacing_m: 18,
    lighting: 'residential-pole',
    colour_tendency: 'mixed-warm',
    identity: 'Chapel-corner residential street. Mixed hedgerow boundaries.',
    evidence: []
  },
  {
    name: 'Skiffergatan',
    vegetation: 'moderate',
    canopy: 'framed',
    boundary: 'wooden-fence',
    surface: 'gravel',
    slope: 'flat',
    plot_openness: 'partial',
    tree_species: 'mixed',
    tree_spacing_m: 18,
    lighting: 'residential-pole',
    colour_tendency: 'mixed-warm',
    identity: 'Northern residential access. Wooden fences typical, mixed species trees, historic slate industry adjacent.',
    evidence: []
  },
  {
    name: 'Bergslagsgatan',
    vegetation: 'sparse',
    canopy: 'open',
    boundary: 'mixed',
    surface: 'gravel',
    slope: 'gentle-slope',
    plot_openness: 'partial',
    tree_species: 'mixed',
    tree_spacing_m: 24,
    lighting: 'residential-pole',
    colour_tendency: 'mixed-warm',
    identity: 'Northern residential belt. Sparse vegetation, mixed boundaries, low residential density.',
    evidence: []
  },
  {
    name: 'Baluns väg',
    vegetation: 'sparse',
    canopy: 'open',
    boundary: 'wire-fence',
    surface: 'gravel',
    slope: 'flat',
    plot_openness: 'open',
    tree_species: 'mixed',
    tree_spacing_m: 30,
    lighting: 'none',
    colour_tendency: 'weathered-timber',
    identity: 'Rural agricultural / peripheral access. Fields and outbuildings, wire farm-style fencing, minimal vegetation on verges.',
    evidence: []
  },
  {
    name: 'Kvarnvägen',
    vegetation: 'moderate',
    canopy: 'framed',
    boundary: 'hedge',
    surface: 'gravel',
    slope: 'flat',
    plot_openness: 'partial',
    tree_species: 'mixed',
    tree_spacing_m: 20,
    lighting: 'residential-pole',
    colour_tendency: 'mixed-warm',
    identity: 'Mill road — leads to Grythytte Qvarn historic mill site. Rural / semi-rural character.',
    evidence: []
  }
];

// ---------------------------------------------------------------- lookup

const CATALOGUE: Map<string, StreetProfile> = new Map(CURATED.map((p) => [p.name, p]));

/** Look up a street's profile by OSM name. Returns DEFAULT_PROFILE with
 * the street's name filled in when no curated entry exists. */
export function streetProfile(name: string | null | undefined): StreetProfile {
  if (name && CATALOGUE.has(name)) return CATALOGUE.get(name)!;
  return { ...DEFAULT_PROFILE, name: name ?? '(unnamed)' };
}

/** All curated profiles — used by the STREET_PROFILE_CATALOGUE
 * generator and by scene components that pre-compute per-street data. */
export function allProfiles(): StreetProfile[] {
  return CURATED.slice();
}

/** Set of all named streets in world.json — used to compare "surveyed
 * vs unsurveyed" in the catalogue doc. */
export function allNamedStreets(): string[] {
  const s = new Set<string>();
  for (const r of WORLD.roads) if (r.name) s.add(r.name);
  return [...s].sort();
}

/** Given a world (x, z), find the closest named road segment and
 * return its street profile. Used by boundary + surface renderers to
 * decide which style a plot inherits based on which street it fronts. */
export function nearestStreetProfile(x: number, z: number): StreetProfile {
  let bestName: string | null = null;
  let bestDist = Infinity;
  for (const road of WORLD.roads) {
    if (!road.name) continue;
    if (road.poly.length < 2) continue;
    for (let i = 1; i < road.poly.length; i++) {
      const ax = road.poly[i - 1][0];
      const az = road.poly[i - 1][1];
      const bx = road.poly[i][0];
      const bz = road.poly[i][1];
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz;
      if (l2 === 0) continue;
      let t = ((x - ax) * dx + (z - az) * dz) / l2;
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      const px = ax + dx * t;
      const pz = az + dz * t;
      const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d2 < bestDist) {
        bestDist = d2;
        bestName = road.name;
      }
    }
  }
  return streetProfile(bestName);
}
