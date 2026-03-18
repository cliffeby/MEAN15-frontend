import { PrintablePlayer } from '../models/printable-player.interface';
import { ScorecardData } from '../models/scorecard.interface';
import { HandicapCalculationService } from '../services/handicap-calculation.service';
import { OneBallResult } from './one-ball.utils';

export interface MatchWinnersResult {
  oneBallWinners: string[];       // member _ids of players on the winning 1-ball team
  twoBallWinners: string[];       // member _ids of players on the winning 2-ball team
  indoWinners: string[];          // member _ids of individual net winners
  oneBallWinnerNames: string[];
  twoBallWinnerNames: string[];
  indoWinnerNames: string[];
}

/**
 * Full individual net score: sum of (gross − full course-handicap strokes) per hole.
 * Returns null if the player has no recorded scores at all.
 */
export function calculatePlayerNetScore(
  player: PrintablePlayer,
  scorecard: ScorecardData,
  handicapService: HandicapCalculationService,
): number | null {
  if (!player.scores) return null;
  let total: number | null = null;
  for (let h = 0; h < 18; h++) {
    const gross = player.scores[h];
    if (gross == null || gross <= 0) continue;
    const holeHcp = handicapService.getHoleHandicap(scorecard, h);
    const strokes = handicapService.getStrokeCountOnHole(player.rochIndex, holeHcp);
    total = (total ?? 0) + (gross - strokes);
  }
  return total;
}

/**
 * Determine winners across 1-ball, 2-ball, and individual net categories for one
 * foursome group. Ties: all tied players/teams are included.
 *
 * group layout: [team1player1, team1player2, team2player1, team2player2] (nulls OK).
 * oneBallTeam1/2 must already be computed with differential strokes.
 */
export function calculateMatchWinners(
  group: (PrintablePlayer | null)[],
  scorecard: ScorecardData,
  handicapService: HandicapCalculationService,
  oneBallTeam1: OneBallResult,
  oneBallTeam2: OneBallResult,
): MatchWinnersResult {
  const [t1p1, t1p2, t2p1, t2p2] = [
    group[0] ?? null, group[1] ?? null, group[2] ?? null, group[3] ?? null,
  ];
  const playerName = (p: PrintablePlayer) =>
    `${p.member.firstName} ${p.member.lastName || ''}`.trim();

  // ── 1-ball: team with lowest oneBall total ────────────────────────────────
  const oneBallWinners: string[] = [];
  const oneBallWinnerNames: string[] = [];
  if (oneBallTeam1.total !== null || oneBallTeam2.total !== null) {
    const t1 = oneBallTeam1.total ?? Infinity;
    const t2 = oneBallTeam2.total ?? Infinity;
    if (t1 <= t2) {
      for (const p of [t1p1, t1p2]) {
        if (p) { oneBallWinners.push(p.member._id); oneBallWinnerNames.push(playerName(p)); }
      }
    }
    if (t2 <= t1) {
      for (const p of [t2p1, t2p2]) {
        if (p) { oneBallWinners.push(p.member._id); oneBallWinnerNames.push(playerName(p)); }
      }
    }
  }

  // ── 2-ball: team with lowest combined net score ───────────────────────────
  const twoBallWinners: string[] = [];
  const twoBallWinnerNames: string[] = [];
  const netOf = (p: PrintablePlayer | null) =>
    p ? calculatePlayerNetScore(p, scorecard, handicapService) : null;
  const n0 = netOf(t1p1), n1 = netOf(t1p2), n2 = netOf(t2p1), n3 = netOf(t2p2);
  // If only one player has a score on a team, use that alone; both null → null
  const t1comb = n0 !== null && n1 !== null ? n0 + n1 : (n0 ?? n1);
  const t2comb = n2 !== null && n3 !== null ? n2 + n3 : (n2 ?? n3);
  if (t1comb !== null || t2comb !== null) {
    const t1 = t1comb ?? Infinity, t2 = t2comb ?? Infinity;
    if (t1 <= t2) {
      for (const p of [t1p1, t1p2]) {
        if (p) { twoBallWinners.push(p.member._id); twoBallWinnerNames.push(playerName(p)); }
      }
    }
    if (t2 <= t1) {
      for (const p of [t2p1, t2p2]) {
        if (p) { twoBallWinners.push(p.member._id); twoBallWinnerNames.push(playerName(p)); }
      }
    }
  }

  // ── Indo: lowest individual net score ────────────────────────────────────
  const indoWinners: string[] = [];
  const indoWinnerNames: string[] = [];
  const allPlayers = [t1p1, t1p2, t2p1, t2p2].filter((p): p is PrintablePlayer => p !== null);
  const playerNets = allPlayers
    .map(p => ({ p, net: calculatePlayerNetScore(p, scorecard, handicapService) }))
    .filter((x): x is { p: PrintablePlayer; net: number } => x.net !== null);
  if (playerNets.length > 0) {
    const best = Math.min(...playerNets.map(x => x.net));
    for (const { p, net } of playerNets) {
      if (net === best) { indoWinners.push(p.member._id); indoWinnerNames.push(playerName(p)); }
    }
  }

  return {
    oneBallWinners, twoBallWinners, indoWinners,
    oneBallWinnerNames, twoBallWinnerNames, indoWinnerNames,
  };
}
