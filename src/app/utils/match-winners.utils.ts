import { PrintablePlayer } from '../models/printable-player.interface';
import { ScorecardData } from '../models/scorecard.interface';
import { HandicapCalculationService } from '../services/handicap-calculation.service';
import { OneBallResult } from './one-ball.utils';

export interface MatchWinnersResult {
  /** 2-ball: team(s) with lowest combined net-to-par */
  twoBallWinners: string[];
  twoBallWinnerNames: string[];
  /** Combined score to par (sum of each player's net-to-par for holes played) */
  twoBallScore: number | null;

  /**
   * 1-ball: after sweep rule � exclude any team that won 2-ball outright.
   * 1st-place IDs stored here (for DB wonOneBall flag).
   */
  oneBallWinners: string[];
  oneBallFirstNames: string[];
  oneBallFirstScore: number | null;
  /** 2nd place � only populated when 1st was NOT a tie; empty otherwise */
  oneBallSecondNames: string[];
  oneBallSecondScore: number | null;

  /** Indo (per-group placeholder � overridden globally by component) */
  indoWinners: string[];
  indoWinnerNames: string[];
  indoScore: number | null;
}

/**
 * Full individual net score: sum of (gross - course-handicap strokes) per hole.
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
 * Individual net score relative to par (only for holes actually played).
 * Returns null if the player has no recorded scores.
 */
export function calculatePlayerScoreToPar(
  player: PrintablePlayer,
  scorecard: ScorecardData,
  handicapService: HandicapCalculationService,
): number | null {
  if (!player.scores) return null;
  let total: number | null = null;
  for (let h = 0; h < 18; h++) {
    const gross = player.scores[h];
    if (gross == null || gross <= 0) continue;
    const par = scorecard.pars?.[h] ?? 4;
    const holeHcp = handicapService.getHoleHandicap(scorecard, h);
    const strokes = handicapService.getStrokeCountOnHole(player.rochIndex, holeHcp);
    total = (total ?? 0) + (gross - strokes - par);
  }
  return total;
}

/**
 * Determine winners across 1-ball, 2-ball, and individual net for one foursome group.
 *
 * group layout: [team1player1, team1player2, team2player1, team2player2] (nulls OK).
 * oneBallTeam1/2 must be computed with useFullNet=true (full individual net strokes, not Nassau differential).
 *
 * Sweep rule: if one team wins 2-ball OUTRIGHT (not tied), they are excluded from
 * 1-ball contention entirely. The remaining team(s) compete for 1-ball normally.
 * Indo stands alone with no restrictions.
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

  // -- 2-ball: lowest combined net-to-par -----------------------------------
  const s2p = (p: PrintablePlayer | null) =>
    p ? calculatePlayerScoreToPar(p, scorecard, handicapService) : null;
  const s0 = s2p(t1p1), s1 = s2p(t1p2), s2 = s2p(t2p1), s3 = s2p(t2p2);
  const t1twoScore = s0 !== null && s1 !== null ? s0 + s1 : (s0 ?? s1);
  const t2twoScore = s2 !== null && s3 !== null ? s2 + s3 : (s2 ?? s3);

  const twoBallWinners: string[] = [];
  const twoBallWinnerNames: string[] = [];
  let twoBallScore: number | null = null;
  let team1WinsTwoBallOutright = false;
  let team2WinsTwoBallOutright = false;

  if (t1twoScore !== null || t2twoScore !== null) {
    const v1 = t1twoScore ?? Infinity, v2 = t2twoScore ?? Infinity;
    if (v1 <= v2) {
      for (const p of [t1p1, t1p2]) {
        if (p) { twoBallWinners.push(p.member._id); twoBallWinnerNames.push(playerName(p)); }
      }
      twoBallScore = t1twoScore;
    }
    if (v2 <= v1) {
      for (const p of [t2p1, t2p2]) {
        if (p) { twoBallWinners.push(p.member._id); twoBallWinnerNames.push(playerName(p)); }
      }
      if (twoBallScore === null) twoBallScore = t2twoScore;
    }
    team1WinsTwoBallOutright = v1 < v2;
    team2WinsTwoBallOutright = v2 < v1;
  }

  // -- 1-ball: exclude any team that won 2-ball outright --------------------
  interface TeamEntry { ids: string[]; names: string[]; score: number }
  const oneBallCandidates: TeamEntry[] = [];

  const addIfEligible = (
    players: (PrintablePlayer | null)[],
    obScore: number | null,
    excluded: boolean,
  ) => {
    if (excluded || obScore === null) return;
    const ids: string[] = [], names: string[] = [];
    for (const p of players) {
      if (p) { ids.push(p.member._id); names.push(playerName(p)); }
    }
    if (ids.length > 0) oneBallCandidates.push({ ids, names, score: obScore });
  };

  addIfEligible([t1p1, t1p2], oneBallTeam1.total, team1WinsTwoBallOutright);
  addIfEligible([t2p1, t2p2], oneBallTeam2.total, team2WinsTwoBallOutright);

  const oneBallWinners: string[] = [];
  const oneBallFirstNames: string[] = [];
  let oneBallFirstScore: number | null = null;
  const oneBallSecondNames: string[] = [];
  let oneBallSecondScore: number | null = null;

  if (oneBallCandidates.length > 0) {
    const bestScore = Math.min(...oneBallCandidates.map(c => c.score));
    const firstPlaceTeams = oneBallCandidates.filter(c => c.score === bestScore);
    for (const t of firstPlaceTeams) {
      oneBallWinners.push(...t.ids);
      oneBallFirstNames.push(...t.names);
    }
    oneBallFirstScore = bestScore;

    // 2nd place only when exactly one team took 1st (no tied 1st)
    if (firstPlaceTeams.length === 1) {
      const remaining = oneBallCandidates.filter(c => c.score !== bestScore);
      if (remaining.length > 0) {
        const secondScore = Math.min(...remaining.map(c => c.score));
        for (const t of remaining.filter(c => c.score === secondScore)) {
          oneBallSecondNames.push(...t.names);
        }
        oneBallSecondScore = secondScore;
      }
    }
  }

  // -- Indo: lowest individual net-to-par in group (overridden globally) ---
  const indoWinners: string[] = [];
  const indoWinnerNames: string[] = [];
  let indoScore: number | null = null;

  const allPlayers = [t1p1, t1p2, t2p1, t2p2].filter((p): p is PrintablePlayer => p !== null);
  const playerScores = allPlayers
    .map(p => ({ p, score: calculatePlayerScoreToPar(p, scorecard, handicapService) }))
    .filter((x): x is { p: PrintablePlayer; score: number } => x.score !== null);
  if (playerScores.length > 0) {
    const best = Math.min(...playerScores.map(x => x.score));
    for (const { p, score } of playerScores) {
      if (score === best) { indoWinners.push(p.member._id); indoWinnerNames.push(playerName(p)); }
    }
    indoScore = best;
  }

  return {
    twoBallWinners, twoBallWinnerNames, twoBallScore,
    oneBallWinners, oneBallFirstNames, oneBallFirstScore,
    oneBallSecondNames, oneBallSecondScore,
    indoWinners, indoWinnerNames, indoScore,
  };
}

export interface SkinResult {
  playerName: string;
  memberId: string;
  hole: number;  // 1-based
}

/**
 * Calculate gross and net skins across all players in the match.
 * A skin is awarded on a hole when exactly one player has the lowest score;
 * ties cancel the skin for that hole.
 * Net score per hole = gross − handicap strokes received on that hole.
 */
export function calculateSkins(
  allPlayers: PrintablePlayer[],
  scorecard: ScorecardData,
  handicapService: HandicapCalculationService,
): { grossSkins: SkinResult[]; netSkins: SkinResult[] } {
  const grossSkins: SkinResult[] = [];
  const netSkins: SkinResult[] = [];

  for (let h = 0; h < 18; h++) {
    const holeHcp = handicapService.getHoleHandicap(scorecard, h);

    // ── Gross skins ──
    let bestGross: number | null = null;
    let grossWinner: PrintablePlayer | null = null;
    let grossTied = false;
    for (const p of allPlayers) {
      const gross = p.scores?.[h];
      if (gross == null || gross <= 0) continue;
      if (bestGross === null || gross < bestGross) {
        bestGross = gross; grossWinner = p; grossTied = false;
      } else if (gross === bestGross) {
        grossTied = true; grossWinner = null;
      }
    }
    if (!grossTied && grossWinner) {
      grossSkins.push({
        playerName: `${grossWinner.member.firstName} ${grossWinner.member.lastName || ''}`.trim(),
        memberId: grossWinner.member._id,
        hole: h + 1,
      });
    }

    // ── Net skins ──
    let bestNet: number | null = null;
    let netWinner: PrintablePlayer | null = null;
    let netTied = false;
    for (const p of allPlayers) {
      const gross = p.scores?.[h];
      if (gross == null || gross <= 0) continue;
      const strokes = handicapService.getStrokeCountOnHole(p.rochIndex, holeHcp);
      const net = gross - strokes;
      if (bestNet === null || net < bestNet) {
        bestNet = net; netWinner = p; netTied = false;
      } else if (net === bestNet) {
        netTied = true; netWinner = null;
      }
    }
    if (!netTied && netWinner) {
      netSkins.push({
        playerName: `${netWinner.member.firstName} ${netWinner.member.lastName || ''}`.trim(),
        memberId: netWinner.member._id,
        hole: h + 1,
      });
    }
  }

  return { grossSkins, netSkins };
}
