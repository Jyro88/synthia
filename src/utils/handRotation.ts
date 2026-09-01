// Deterministic small rotation per element card so pieces on the canvas look
// scattered/placed by hand rather than perfectly upright -- derived from a
// stable id (not random), so a given card doesn't jitter between re-renders.
export const handRotation = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return ((Math.abs(hash) % 600) / 100) - 3; // -3deg to 3deg
};
