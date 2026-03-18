import { OneBallResult } from './one-ball.utils';

export interface NassauStatus {
  /**
   * Combined press display string per hole, e.g. "+2", "-1/0", "+4/+2/0".
   * Holes 0-8  → front-nine bet (+ any presses).
   * Holes 9-17 → back-nine bet (+ any presses, resets at hole 10).
   * null when neither team has a score for that hole yet.
   */
  holeStatus: (string | null)[];
  /** Final front-nine display for the OUT column. */
  frontNineStatus: string | null;
  /** Final back-nine display for the IN column. */
  backNineStatus: string | null;
  /** Final overall 18-hole net-wins display for the TOT column. */
  overallStatus: string | null;
  /**
   * 18-hole automatic press: activates when the overall bet is mathematically
   * closed out (leader's margin > holes remaining). Null for every hole until
   * the press becomes active.
   */
  overallPressHoles: (string | null)[];
  /** Final overall press value for display, or null if the press never activated. */
  overallPressFinal: string | null;
}

/** Format a bet value: 0 → "AS" when it is the only active bet, numeric otherwise. */
function fmtSingle(v: number): string {
  if (v === 0) return 'AS';
  return v > 0 ? `+${v}` : `${v}`;
}

/** Format a bet value inside a combined slash display (0 → "0"). */
function fmtBet(v: number): string {
  if (v === 0) return '0';
  return v > 0 ? `+${v}` : `${v}`;
}

interface ActiveBet {
  running: number;
  /** True once this bet has spawned its allowed two-down press. */
  hasSpawnedPress: boolean;
}

/**
 * Process a single Nassau segment (front 9, back 9, or all 18).
 *
 * Two-down press rules:
 *   - A main bet starts at 0 on the first hole with a recorded score.
 *   - When any active bet first reaches ±2, it spawns a new press bet.
 *     The press shows "0" on the trigger hole and accumulates from the next hole.
 *   - Each bet spawns at most one press; however a press can itself spawn a press
 *     when it reaches ±2, allowing unlimited cascading bets.
 *
 * @param holeDeltas +1 = Team1 wins, -1 = Team2 wins, 0 = halved, null = not played
 */
function processSegment(holeDeltas: (number | null)[]): {
  holeDisplays: (string | null)[];
  finalDisplay: string | null;
  /** Final running value of every active bet in this segment (main + presses). */
  finalBetValues: number[];
} {
  const n = holeDeltas.length;
  const holeDisplays: (string | null)[] = new Array(n).fill(null);
  const bets: ActiveBet[] = [];
  let mainStarted = false;
  // Presses created at end of this hole: shown as "0" this hole, active next hole.
  let pendingPresses: ActiveBet[] = [];

  function buildDisplay(): string {
    const all = [...bets, ...pendingPresses];
    if (all.length === 1 && pendingPresses.length === 0) {
      return fmtSingle(all[0].running);
    }
    return all.map(b => fmtBet(b.running)).join('/');
  }

  for (let i = 0; i < n; i++) {
    // Promote last hole's pending presses into active bets.
    bets.push(...pendingPresses);
    pendingPresses = [];

    const delta = holeDeltas[i];

    if (!mainStarted) {
      if (delta === null) { holeDisplays[i] = null; continue; }
      mainStarted = true;
      bets.push({ running: 0, hasSpawnedPress: false });
    }

    if (delta === null) {
      // Score not yet entered — carry forward current status.
      holeDisplays[i] = mainStarted ? buildDisplay() : null;
      continue;
    }

    // Update every active bet.
    for (const bet of bets) {
      bet.running += delta;
    }

    // Spawn presses for any bet that just first crossed ±2.
    for (const bet of bets) {
      if (!bet.hasSpawnedPress && Math.abs(bet.running) >= 2) {
        bet.hasSpawnedPress = true;
        pendingPresses.push({ running: 0, hasSpawnedPress: false });
      }
    }

    holeDisplays[i] = buildDisplay();
  }

  // Absorb any trailing pending presses.
  bets.push(...pendingPresses);
  const finalDisplay = mainStarted ? bets.map(b => fmtBet(b.running)).join('/') : null;
  const finalBetValues = mainStarted ? bets.map(b => b.running) : [];

  return { holeDisplays, finalDisplay, finalBetValues };
}

/**
 * Calculate fourball Nassau match status with automatic two-down presses.
 *
 * Three separate bets:
 *   Front 9:  holes 1–9   → holeStatus[0–8],  OUT column
 *   Back 9:   holes 10–18 → holeStatus[9–17], IN column (resets at hole 10)
 *   Overall:  holes 1–18  → TOT column only
 *
 * Positive = Team 1 winning; negative = Team 2 winning.
 * Display examples: "+2", "AS", "-1/0", "+4/+2/0"
 */
export function calculateFourballNassau(
  oneBallTeam1: OneBallResult,
  oneBallTeam2: OneBallResult
): NassauStatus {
  const deltas: (number | null)[] = oneBallTeam1.holes.map((h1, i) => {
    const t1 = h1.relToPar;
    const t2 = oneBallTeam2.holes[i]?.relToPar ?? null;
    if (t1 === null || t2 === null) return null;
    return t1 < t2 ? 1 : t2 < t1 ? -1 : 0;
  });

  const frontResult  = processSegment(deltas.slice(0, 9));
  const backResult   = processSegment(deltas.slice(9, 18));

  // The overall 18-hole Nassau is exactly ONE additional bet (winner of the full round).
  // It does not spawn its own presses — that is handled separately below.
  const anyPlayed = deltas.some(d => d !== null);
  const overallNetDelta = deltas.reduce<number>((sum, d) => sum + (d ?? 0), 0);
  const overallBetValue = Math.sign(overallNetDelta); // +1, -1, or 0

  // ── 18-hole automatic press ─────────────────────────────────────────────────
  // The press triggers the hole AFTER the overall bet is mathematically closed:
  // i.e. when abs(running) > holes remaining after this hole (17 - h).
  // Once active it accumulates a simple cumulative delta (no further presses).
  const overallPressHoles: (string | null)[] = new Array(18).fill(null);
  let overallPressFinal: string | null = null;
  let overallPressValue = 0; // used for netWins
  {
    let mainR = 0;
    let pressActive = false;
    let pressR = 0;
    let pressHasScore = false;

    for (let h = 0; h < 18; h++) {
      const d = deltas[h];
      if (!pressActive) {
        if (d !== null) mainR += d;
        const holesLeft = 17 - h;
        if (!pressActive && Math.abs(mainR) > holesLeft) {
          pressActive = true; // press starts accumulating from next hole
        }
        overallPressHoles[h] = null;
      } else {
        if (d !== null) {
          pressR += d;
          pressHasScore = true;
        }
        overallPressHoles[h] = pressHasScore
          ? (pressR === 0 ? 'AS' : pressR > 0 ? `+${pressR}` : `${pressR}`)
          : null;
      }
    }
    if (pressHasScore) {
      overallPressFinal = pressR === 0 ? '0X' : pressR > 0 ? '+1X' : '-1X';
      overallPressValue = Math.sign(pressR);
    }
  }

  // Total = net won/lost bets: front bets + back bets + 1 overall bet + 1 press (if active).
  const allFinalBets = [
    ...frontResult.finalBetValues,
    ...backResult.finalBetValues,
    ...(anyPlayed ? [overallBetValue] : []),
    ...(overallPressFinal !== null ? [overallPressValue] : []),
  ];
  const netWins = allFinalBets.reduce((sum, v) => sum + Math.sign(v), 0);
  const overallStatus = anyPlayed
    ? (netWins === 0 ? '0' : netWins > 0 ? `+${netWins}X` : `${netWins}X`)
    : null;

  return {
    holeStatus:       [...frontResult.holeDisplays, ...backResult.holeDisplays],
    frontNineStatus:  frontResult.finalDisplay,
    backNineStatus:   backResult.finalDisplay,
    overallStatus,
    overallPressHoles,
    overallPressFinal,
  };
}
