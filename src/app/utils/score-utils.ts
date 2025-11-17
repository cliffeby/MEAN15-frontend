// Utility functions for score calculations

export function sumScores(scores: (number | null)[]): number {
  return scores.reduce((sum: number, score: number | null) => sum + (score || 0), 0);
}

export function calculateCourseHandicap(usgaIndex: number, slope?: number): number {
  if (!slope) return 0;
  return Math.round((usgaIndex * slope) / 113);
}

export function getParForHole(pars: number[] | undefined, holeIndex: number): number {
  return pars?.[holeIndex] || 4;
}

export function getCoursePar(par?: number, pars?: number[]): number {
  return par || pars?.reduce((sum, p) => sum + p, 0) || 72;
}

export function getFrontNinePar(pars?: number[]): number {
  return pars?.slice(0, 9).reduce((sum, p) => sum + p, 0) || 36;
}

export function getBackNinePar(pars?: number[]): number {
  return pars?.slice(9, 18).reduce((sum, p) => sum + p, 0) || 36;
}

export function calculatePlayerTotals(scores: (number | null)[], handicap: number): {
  frontNine: number;
  backNine: number;
  total: number;
  netScore: number;
} {
  const frontNine = sumScores(scores.slice(0, 9));
  const backNine = sumScores(scores.slice(9, 18));
  const total = frontNine + backNine;
  const netScore = total - handicap;
  return { frontNine, backNine, total, netScore };
}
