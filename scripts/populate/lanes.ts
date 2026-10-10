export interface Lane {
  name: string;
  // Fed into the Judge prompt as a soft tiebreaker (see buildPrompt's
  // themeSection) -- never overrides the causal/naming/no-op rules, only
  // nudges which honestly-valid result gets picked when more than one exists.
  themeHint: string;
  // Element ids whose candidate weight gets boosted in this lane, so it keeps
  // periodically reaching back to fresh starting points instead of only ever
  // deepening whatever's currently sparsest. Defaults to the four roots.
  anchorIds?: string[];
}

const ROOT_IDS = ['fire', 'water', 'earth', 'air'];

// A modest default set covering the directions discussed -- easy to add to
// or override per run via --lane/--branch (see run.ts).
export const DEFAULT_LANES: Lane[] = [
  {
    name: 'life',
    themeHint: 'biology, living things, growth, ecosystems, organisms'
  },
  {
    name: 'culture',
    themeHint: 'human society, community, tradition, food, art, tools people make and use'
  },
  {
    name: 'emotion',
    themeHint: 'emotions, relationships, and other abstract mental or social states'
  },
  {
    name: 'technology',
    themeHint: 'invention, machines, energy, industry, human ingenuity'
  }
];

export const resolveLane = (name: string): Lane | undefined =>
  DEFAULT_LANES.find(lane => lane.name === name);

export const laneAnchorIds = (lane: Lane): Set<string> =>
  new Set(lane.anchorIds ?? ROOT_IDS);
