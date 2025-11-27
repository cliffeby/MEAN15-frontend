import { Member } from '../models/member';
import { MEMBER_B_DUMMY } from '../models/member-b-dummy';

export function getTeamIndexSum(team: string[], getMemberById: (id: string) => Member | undefined): number {
  let sum = 0;
  for (const memberId of team) {
    const member = getMemberById(memberId);
    if (member && typeof member.usgaIndex === 'number') {
      sum += member.usgaIndex;
    }
  }
  return Math.round(sum * 10) / 10;
}

export function pairFourballTeams(members: Member[], getMemberById: (id: string) => Member | undefined, lineUpsArray: any): {
  pairedTeams: { teamA: string[]; teamB: string[]; combinedA: number; combinedB: number }[];
  foursomeIdsTEMP: string[][];
  partnerIdsTEMP: string[][];
} {
  let lineupIds: string[] = lineUpsArray.value as string[];
  let lineupMembers = lineupIds.map((id) => getMemberById(id)).filter(Boolean) as Member[];
  if (lineupMembers.length % 2 !== 0 && lineupMembers.length > 1) {
    let sortedForDummy = [...lineupMembers].sort((a, b) => (a.usgaIndex ?? 99) - (b.usgaIndex ?? 99));
    const lastPlayer = sortedForDummy[sortedForDummy.length - 1];
    if (lastPlayer) {
      const dummy: Member = { ...MEMBER_B_DUMMY, _id: '00000000000000000000B001', usgaIndex: lastPlayer.usgaIndex };
      lineupMembers.push(dummy);
    }
  }
  lineupMembers.sort((a, b) => (a.usgaIndex ?? 99) - (b.usgaIndex ?? 99));
  let sortedMembers = [...lineupMembers].sort((a, b) => (a.usgaIndex ?? 99) - (b.usgaIndex ?? 99));
  let n = sortedMembers.length;
  let half = Math.floor(n / 2);
  let aPlayers = sortedMembers.slice(0, half);
  let bPlayers = sortedMembers.slice(half);
  let teams: { ids: string[]; combined: number }[] = [];
  for (let i = 0; i < half; i++) {
    let a = aPlayers[i];
    let b = bPlayers[half - 1 - i];
    if ((a?.usgaIndex ?? 99) > (b?.usgaIndex ?? 99)) {
      [a, b] = [b, a];
    }
    const aId = typeof a?._id === 'string' ? a._id : '';
    const bId = typeof b?._id === 'string' ? b._id : '';
    const combined = Math.round(((a?.usgaIndex ?? 0) + (b?.usgaIndex ?? 0)) * 10) / 10;
    teams.push({ ids: [aId, bId], combined });
  }
  let pairedTeams: { teamA: string[]; teamB: string[]; combinedA: number; combinedB: number }[] = [];
  let foursomeIdsTEMP: string[][] = [];
  let partnerIdsTEMP: string[][] = [];
  let i = 0;
  while (i < teams.length) {
    if (teams.length - i === 3 && n === 11) {
      const trio = [teams[i].ids[0], teams[i].ids[1], teams[i+1].ids[0]];
      pairedTeams.push({
        teamA: trio,
        teamB: [],
        combinedA: getTeamIndexSum(trio, getMemberById),
        combinedB: 0,
      });
      foursomeIdsTEMP.push([...trio]);
      partnerIdsTEMP.push([...trio]);
      break;
    }
    let teamA = teams[i];
    let teamB = teams[i + 1];
    if (teamB) {
      pairedTeams.push({
        teamA: teamA.ids,
        teamB: teamB.ids,
        combinedA: teamA.combined,
        combinedB: teamB.combined,
      });
      foursomeIdsTEMP.push([...teamA.ids, ...teamB.ids]);
      partnerIdsTEMP.push([...teamA.ids]);
      partnerIdsTEMP.push([...teamB.ids]);
    } else {
      pairedTeams.push({
        teamA: teamA.ids,
        teamB: [],
        combinedA: teamA.combined,
        combinedB: 0,
      });
      foursomeIdsTEMP.push([...teamA.ids]);
      partnerIdsTEMP.push([...teamA.ids]);
    }
    i += 2;
  }
  return { pairedTeams, foursomeIdsTEMP, partnerIdsTEMP };
}
