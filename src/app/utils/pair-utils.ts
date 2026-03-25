import { Member } from '../models/member';

function getMemberIndex(member: Member, method: string): number {
  return method === 'usga'
    ? (typeof member.usgaIndexB4Round === 'number' ? member.usgaIndexB4Round : 0)
    : (typeof member.rochIndexB4Round === 'number' ? member.rochIndexB4Round : 0);
}

export function getTeamIndexSum(team: string[], getMemberById: (id: string) => Member | undefined, method = 'roch'): number {
  let sum = 0;
  for (const memberId of team) {
    const member = getMemberById(memberId);
    if (member) {
      sum += getMemberIndex(member, method);
    }
  }
  return Math.round(sum * 10) / 10;
}

/**
 * Determines golf group sizes for n players.
 * Rules (per user spec, for n >= 6):
 *   n % 4 === 0 → all foursomes
 *   n % 4 === 3 → foursomes + 1 threesome  (3, 7, 11, 15 …)
 *   n % 4 === 2 → foursomes + 2 threesomes (6, 10, 14 …)
 *   n % 4 === 1 → foursomes + 3 threesomes (9, 13, 17 …)
 *   n === 5     → [4, 1]  (unavoidable single)
 *   n < 4      → one group of n
 */
export function getGroupSizes(n: number): number[] {
  if (n <= 0) return [];
  if (n <= 3) return [n];
  if (n === 5) return [4, 1];
  const rem = n % 4;
  if (rem === 0) return Array(n / 4).fill(4);
  if (rem === 3) return [...Array((n - 3) / 4).fill(4), 3];
  if (rem === 2) return [...Array((n - 6) / 4).fill(4), 3, 3];
  // rem === 1, n >= 9
  return [...Array((n - 9) / 4).fill(4), 3, 3, 3];
}

export type PairedGroup = { teamA: string[]; teamB: string[]; combinedA: number; combinedB: number; loneA?: string };

export function pairFourballTeams(members: Member[], getMemberById: (id: string) => Member | undefined, lineUpsArray: any, method = 'roch'): {
  pairedTeams: PairedGroup[];
  foursomeIdsTEMP: string[][];
  partnerIdsTEMP: string[][];
} {
  const lineupIds: string[] = lineUpsArray.value as string[];
  const lineupMembers = lineupIds.map((id) => getMemberById(id)).filter(Boolean) as Member[];
  lineupMembers.sort((a, b) => (getMemberIndex(a, method) ?? 99) - (getMemberIndex(b, method) ?? 99));

  const groupSizes = getGroupSizes(lineupMembers.length);

  // A players = top (lowest handicap) players, 2 per group of size >= 3.
  // B players = the rest (higher handicap + any solo player).
  const numA = 2 * groupSizes.filter(s => s >= 3).length;
  const aPlayers = lineupMembers.slice(0, numA);
  const bPlayers = lineupMembers.slice(numA);

  const pairedTeams: PairedGroup[] = [];
  const foursomeIdsTEMP: string[][] = [];
  const partnerIdsTEMP: string[][] = [];

  let aIdx = 0;
  let bIdx = 0;

  for (const size of groupSizes) {
    if (size === 4) {
      const A1id = aPlayers[aIdx]?._id as string;
      const A2id = aPlayers[aIdx + 1]?._id as string;
      const B1id = bPlayers[bIdx]?._id as string;
      const B2id = bPlayers[bIdx + 1]?._id as string;
      aIdx += 2;
      bIdx += 2;
      // Stored as [A1, A2, B1, B2] for consistent reconstruction
      foursomeIdsTEMP.push([A1id, A2id, B1id, B2id]);
      // Snake: A1(best) + B2(worst) vs A2 + B1
      const teamAIds = [A1id, B2id];
      const teamBIds = [A2id, B1id];
      partnerIdsTEMP.push(teamAIds);
      partnerIdsTEMP.push(teamBIds);
      pairedTeams.push({
        teamA: teamAIds,
        teamB: teamBIds,
        combinedA: getTeamIndexSum(teamAIds, getMemberById, method),
        combinedB: getTeamIndexSum(teamBIds, getMemberById, method),
      });
    } else if (size === 3) {
      const A1id = aPlayers[aIdx]?._id as string;
      const A2id = aPlayers[aIdx + 1]?._id as string;
      const B1id = bPlayers[bIdx]?._id as string;
      aIdx += 2;
      bIdx += 1;
      // Stored as [A1, A2, B1] for consistent reconstruction
      foursomeIdsTEMP.push([A1id, A2id, B1id]);
      // A1 pairs with B1; A2 is the unpaired A player
      const pairIds = [A1id, B1id];
      partnerIdsTEMP.push(pairIds);
      partnerIdsTEMP.push([A2id]);
      pairedTeams.push({
        teamA: pairIds,
        teamB: [],
        combinedA: getTeamIndexSum(pairIds, getMemberById, method),
        combinedB: 0,
        loneA: A2id,
      });
    } else if (size === 2) {
      const p1id = bPlayers[bIdx]?._id as string;
      const p2id = bPlayers[bIdx + 1]?._id as string;
      bIdx += 2;
      foursomeIdsTEMP.push([p1id, p2id]);
      partnerIdsTEMP.push([p1id, p2id]);
      pairedTeams.push({
        teamA: [p1id, p2id],
        teamB: [],
        combinedA: getTeamIndexSum([p1id, p2id], getMemberById, method),
        combinedB: 0,
      });
    } else {
      // Solo (size === 1)
      const soloId = bPlayers[bIdx]?._id as string;
      bIdx += 1;
      foursomeIdsTEMP.push([soloId]);
      partnerIdsTEMP.push([soloId]);
      pairedTeams.push({
        teamA: [soloId],
        teamB: [],
        combinedA: getTeamIndexSum([soloId], getMemberById, method),
        combinedB: 0,
      });
    }
  }

  return { pairedTeams, foursomeIdsTEMP, partnerIdsTEMP };
}

export type RandomPairingCandidate = {
  pairedTeams: PairedGroup[];
  foursomeIdsTEMP: string[][];
  partnerIdsTEMP: string[][];
  aggregateDiff: number;
};

/**
 * Generate 500 random A/B pairings and return the 3 with the lowest aggregate
 * handicap-difference across all foursomes (threesomes are excluded from scoring).
 */
export function pairFourballTeamsRandom(
  getMemberById: (id: string) => Member | undefined,
  lineUpsArray: any,
  trials = 500,
  method = 'roch'
): RandomPairingCandidate[] {
  const lineupIds: string[] = lineUpsArray.value as string[];
  const lineupMembers = lineupIds.map(id => getMemberById(id)).filter(Boolean) as Member[];
  lineupMembers.sort((a, b) => (getMemberIndex(a, method) ?? 99) - (getMemberIndex(b, method) ?? 99));

  const groupSizes = getGroupSizes(lineupMembers.length);
  const numA = 2 * groupSizes.filter(s => s >= 3).length;
  const aBase = lineupMembers.slice(0, numA);
  const bBase = lineupMembers.slice(numA);

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function hcap(id: string): number {
    const m = getMemberById(id);
    return m ? getMemberIndex(m, method) : 0;
  }

  function round1(n: number): number {
    return Math.round(n * 10) / 10;
  }

  function buildCandidate(shuffledA: Member[], shuffledB: Member[]): RandomPairingCandidate {
    const pairedTeams: PairedGroup[] = [];
    const foursomeIdsTEMP: string[][] = [];
    const partnerIdsTEMP: string[][] = [];
    let aggregateDiff = 0;
    let aIdx = 0;
    let bIdx = 0;

    for (const size of groupSizes) {
      if (size === 4) {
        const A1id = shuffledA[aIdx]?._id as string;
        const A2id = shuffledA[aIdx + 1]?._id as string;
        const B1id = shuffledB[bIdx]?._id as string;
        const B2id = shuffledB[bIdx + 1]?._id as string;
        aIdx += 2; bIdx += 2;
        foursomeIdsTEMP.push([A1id, A2id, B1id, B2id]);
        // Snake within the random group: A1+B2 vs A2+B1
        const teamAIds = [A1id, B2id];
        const teamBIds = [A2id, B1id];
        partnerIdsTEMP.push(teamAIds);
        partnerIdsTEMP.push(teamBIds);
        const combA = round1(hcap(A1id) + hcap(B2id));
        const combB = round1(hcap(A2id) + hcap(B1id));
        aggregateDiff += Math.abs(combA - combB);
        pairedTeams.push({ teamA: teamAIds, teamB: teamBIds, combinedA: combA, combinedB: combB });
      } else if (size === 3) {
        const A1id = shuffledA[aIdx]?._id as string;
        const A2id = shuffledA[aIdx + 1]?._id as string;
        const B1id = shuffledB[bIdx]?._id as string;
        aIdx += 2; bIdx += 1;
        foursomeIdsTEMP.push([A1id, A2id, B1id]);
        const pairIds = [A1id, B1id];
        partnerIdsTEMP.push(pairIds);
        partnerIdsTEMP.push([A2id]);
        const combA = round1(hcap(A1id) + hcap(B1id));
        // Threesome excluded from aggregateDiff
        pairedTeams.push({ teamA: pairIds, teamB: [], combinedA: combA, combinedB: 0, loneA: A2id });
      } else if (size === 2) {
        const p1id = shuffledB[bIdx]?._id as string;
        const p2id = shuffledB[bIdx + 1]?._id as string;
        bIdx += 2;
        foursomeIdsTEMP.push([p1id, p2id]);
        partnerIdsTEMP.push([p1id, p2id]);
        pairedTeams.push({ teamA: [p1id, p2id], teamB: [], combinedA: round1(hcap(p1id) + hcap(p2id)), combinedB: 0 });
      } else {
        // Solo (size === 1)
        const soloId = shuffledB[bIdx]?._id as string;
        bIdx += 1;
        foursomeIdsTEMP.push([soloId]);
        partnerIdsTEMP.push([soloId]);
        pairedTeams.push({ teamA: [soloId], teamB: [], combinedA: round1(hcap(soloId)), combinedB: 0 });
      }
    }

    return { pairedTeams, foursomeIdsTEMP, partnerIdsTEMP, aggregateDiff };
  }

  const results: RandomPairingCandidate[] = [];
  for (let i = 0; i < trials; i++) {
    results.push(buildCandidate(shuffle(aBase), shuffle(bBase)));
  }

  results.sort((a, b) => a.aggregateDiff - b.aggregateDiff);
  return results.slice(0, 3);
}
