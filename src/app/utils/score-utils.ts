// Utility functions for score calculations

// import { NonNullableFormBuilder } from "@angular/forms";

export function sumScores(scores: (number | null)[]): number {
  return scores.reduce((sum: number, score: number | null) => sum + (score || 0), 0);
}

export function calculateCourseHandicap(usgaIndex: number, slope?: number): number {
  if (!slope) return 0;
  return Math.round((usgaIndex * slope) / 113);
}

export function calculateDifferential(score: number, slope?: number, rating?:number, par?: number): number {
  if (!slope) return 0;
  return Math.round(((score-rating!) * slope) / 113 );
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

export function calculatePlayerTotals(scores: (number | null)[], rochIndex: number): {
  frontNine: number;
  backNine: number;
  totalScore: number;
  netScore: number;
} {
  const frontNine = sumScores(scores.slice(0, 9));
  const backNine = sumScores(scores.slice(9, 18));
  const totalScore = frontNine + backNine;
  const netScore = totalScore - rochIndex;
  return { frontNine, backNine, totalScore, netScore };
}
