import { PrintablePlayer } from '../models/printable-player.interface';
import { ScorecardData } from '../models/scorecard.interface';
import { HandicapCalculationService } from '../services/handicap-calculation.service';

export interface OneBallHoleResult {
  /** Net better-ball score relative to par, or null if neither player has a score. */
  relToPar: number | null;
}

export interface OneBallResult {
  /** 18 per-hole results. */
  holes: OneBallHoleResult[];
  /** Sum of relToPar for holes 1-9, or null if no front-nine scores exist. */
  frontNineTotal: number | null;
  /** Sum of relToPar for holes 10-18, or null if no back-nine scores exist. */
  backNineTotal: number | null;
  /** Overall sum, or null if no scores exist at all. */
  total: number | null;
}

/**
 * Format a relative-to-par number for scorecard display.
 * Returns undefined (blank cell) when value is null.
 * Examples: -2 → "-2", -1 → "-1", 0 → "E", +1 → "+1"
 */
export function formatOneBallValue(relToPar: number | null): string | undefined {
  if (relToPar === null) return undefined;
  if (relToPar === 0) return 'E';
  return relToPar > 0 ? `+${relToPar}` : `${relToPar}`;
}

/**
 * Calculate the one-ball (net better-ball) values for a two-man team.
 *
 * Per-hole logic:
 *   differential strokes = player strokes on hole - lowest handicap player strokes on hole
 *   net score  = gross score - differential strokes received on that hole
 *   best net   = minimum net score among team members who have entered a score
 *   one-ball value = best net - par
 *
 * lowestHandicap is the lowest course handicap in the entire group (all 4 players),
 * matching what the slash marks on the scorecard indicate.
 *
 * Returns null for any hole where neither player has recorded a score.
 */
export function calculateOneBall(
  player1: PrintablePlayer | null,
  player2: PrintablePlayer | null,
  scorecard: ScorecardData,
  handicapService: HandicapCalculationService,
  lowestHandicap: number = 0
): OneBallResult {
  const holes: OneBallHoleResult[] = [];

  for (let h = 0; h < 18; h++) {
    const par = scorecard.pars?.[h] ?? 4;
    const holeHcp = handicapService.getHoleHandicap(scorecard, h);
    const lowestStrokes = handicapService.getStrokeCountOnHole(lowestHandicap, holeHcp);
    let bestNet: number | null = null;

    for (const player of [player1, player2]) {
      if (!player) continue;
      const gross = player.scores?.[h];
      if (gross == null || gross <= 0) continue;
      const playerStrokes = handicapService.getStrokeCountOnHole(player.rochIndex, holeHcp);
      const differentialStrokes = Math.max(0, playerStrokes - lowestStrokes);
      const net = gross - differentialStrokes;
      if (bestNet === null || net < bestNet) {
        bestNet = net;
      }
    }

    holes.push({ relToPar: bestNet !== null ? bestNet - par : null });
  }

  const frontHoles = holes.slice(0, 9);
  const backHoles = holes.slice(9, 18);
  const hasFront = frontHoles.some(h => h.relToPar !== null);
  const hasBack = backHoles.some(h => h.relToPar !== null);

  const frontNineTotal = hasFront
    ? frontHoles.reduce((sum, h) => sum + (h.relToPar ?? 0), 0)
    : null;
  const backNineTotal = hasBack
    ? backHoles.reduce((sum, h) => sum + (h.relToPar ?? 0), 0)
    : null;
  const total =
    frontNineTotal !== null || backNineTotal !== null
      ? (frontNineTotal ?? 0) + (backNineTotal ?? 0)
      : null;

  return { holes, frontNineTotal, backNineTotal, total };
}
