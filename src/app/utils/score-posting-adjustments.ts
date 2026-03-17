/**
 * Score posting adjustment utilities.
 *
 * Each method caps per-hole scores to a maximum allowed value before posting
 * for handicap purposes.  The raw `scores` array is never mutated; adjusted
 * values are returned in `scoresToPost`.
 *
 * Supported methods:
 *   'usga'   – Double-bogey max (par + 2) per hole.
 *   'roch'   – (future) Roch System net double-bogey.
 *   'custom' – No adjustment; scores posted as-is.
 */

export type HandicapCalculationMethod = 'usga' | 'roch' | 'custom';

export interface PostingAdjustmentResult {
  /** Capped hole-by-hole scores (18 values, 0 for unplayed holes). */
  scoresToPost: number[];
  /** Sum of scoresToPost – the total score to record for handicap posting. */
  postedScore: number;
}

/**
 * Apply double-bogey max (par + 2) to each hole.
 * Holes with a null/0 raw score are left as 0 in scoresToPost.
 */
function applyDoubleBogeyMax(
  scores: (number | null)[],
  pars: number[],
): number[] {
  return Array.from({ length: 18 }, (_, i) => {
    const raw = scores[i];
    if (raw == null || raw <= 0) return 0;
    const par = pars[i] ?? 4;
    return Math.min(raw, par + 2);
  });
}

/**
 * Adjust hole scores for handicap posting based on the selected method.
 *
 * @param scores   Raw hole scores (length 18; null = not played).
 * @param pars     Course par per hole (length 18).
 * @param method   Handicap calculation method from ScoringConfig.
 * @returns        Adjusted scoresToPost array and summed postedScore.
 */
export function adjustScoresForPosting(
  scores: (number | null)[],
  pars: number[],
  method: HandicapCalculationMethod,
): PostingAdjustmentResult {
  let scoresToPost: number[];

  switch (method) {
    case 'usga':
      scoresToPost = applyDoubleBogeyMax(scores, pars);
      break;

    case 'roch':
      // Placeholder – will be implemented per Roch System net double-bogey rule.
      scoresToPost = applyDoubleBogeyMax(scores, pars);
      break;

    case 'custom':
    default:
      // No adjustment – post raw scores as-is.
      scoresToPost = Array.from({ length: 18 }, (_, i) => {
        const v = scores[i];
        return v == null || v <= 0 ? 0 : v;
      });
      break;
  }

  const postedScore = scoresToPost.reduce((sum, s) => sum + s, 0);
  return { scoresToPost, postedScore };
}
