import { Member } from '../models/member';

export function getTeamIndexSum(team: string[], getMemberById: (id: string) => Member | undefined): number {
  let sum = 0;
  for (const memberId of team) {
    const member = getMemberById(memberId);
    if (member && typeof member.usgaIndexB4Round === 'number') {
      sum += member.usgaIndexB4Round;
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

export function pairFourballTeams(members: Member[], getMemberById: (id: string) => Member | undefined, lineUpsArray: any): {
  pairedTeams: PairedGroup[];
  foursomeIdsTEMP: string[][];
  partnerIdsTEMP: string[][];
} {
  const lineupIds: string[] = lineUpsArray.value as string[];
  const lineupMembers = lineupIds.map((id) => getMemberById(id)).filter(Boolean) as Member[];
  lineupMembers.sort((a, b) => (a.usgaIndexB4Round ?? 99) - (b.usgaIndexB4Round ?? 99));

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
        combinedA: getTeamIndexSum(teamAIds, getMemberById),
        combinedB: getTeamIndexSum(teamBIds, getMemberById),
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
        combinedA: getTeamIndexSum(pairIds, getMemberById),
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
        combinedA: getTeamIndexSum([p1id, p2id], getMemberById),
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
        combinedA: getTeamIndexSum([soloId], getMemberById),
        combinedB: 0,
      });
    }
  }

  return { pairedTeams, foursomeIdsTEMP, partnerIdsTEMP };
}
