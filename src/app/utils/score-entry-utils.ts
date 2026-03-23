// Utility functions for score-entry and simple-score-entry components
import { Match } from '../models/match';
import { Member } from '../models/member';
import { Scorecard } from '../models/scorecard.interface'; /**
 * Extracts the scorecard object from a match, handling both direct, populated, and id-only cases.
 * @param match The match object (may have scorecardId as string, object, or id only)
 * @param scorecardList Optional array of all scorecards to look up by id if needed
 * @returns The scorecard object or null if not found
 */
export function getMatchScorecard(match: any, scorecardList?: Scorecard[]): Scorecard | null {
  console.log('getMatchScorecard called with match:', match, 'scorecardList:', scorecardList);
  if (!match) return null;
  // If match.scorecardId is a string (id), look up in scorecardList
  if (typeof match.scorecardId._id === 'string' && scorecardList && Array.isArray(scorecardList)) {
    const found = scorecardList.find(
      (sc: any) => sc._id === match.scorecardId._id || sc.id === match.scorecardId._id,
    );
    if (found && typeof found === 'object' && 'course' in found && 'tees' in found) {
      return found;
    }
  }
  // If not found, return null
  return null;
}

export function getMemberScorecard(
  matchCourse: string,
  memberScorecardIds: any[],
  scorecardList: Scorecard[],
): Scorecard | null {
  if (!memberScorecardIds || memberScorecardIds.length === 0) {
    return null;
  }
  if (matchCourse === '') {
    console.log('getMemberScorecard: matchCourse is empty');
    return null;
  }
  // memberScorecardIds may be an array of strings or legacy objects with a scorecardId property
  const scorecardIdStrings: string[] = memberScorecardIds
    .map((obj: any) => {
      if (typeof obj === 'string') return obj;
      if (typeof obj === 'object' && obj !== null && 'scorecardId' in obj) return obj.scorecardId;
      return null;
    })
    .filter((id: any) => typeof id === 'string');
  const memberScorecards: Scorecard[] = scorecardList.filter((sc) => scorecardIdStrings.includes(sc._id));
  console.log('Member scorecards for course lookup:', memberScorecards, scorecardIdStrings, "MC",matchCourse);
  const memberScorecard = memberScorecards.find((sc: Scorecard) => sc.course === matchCourse);
  if (memberScorecard) {
    return memberScorecard;
  }
  return null;
}
// Function to get the course used for the match.
// The scorecard used is one of many that contain the same course name,
// but will have different tees.
export function getMatchCourseName(match: Match): string {
  let course = '';
  return course || '';
}

/**
 * Re-orders members to match foursome/team display order:
 * For each foursome group: Team1-A, Team1-B, Team2-A, Team2-B
 * stored format [A1, A2, B1, B2] → display order [A1, B2, A2, B1]
 */
export function sortMembersByFoursomeTeamOrder<T extends { _id?: string }>(
  members: T[],
  foursomeIdsTEMP: string[][] | undefined,
): T[] {
  if (!foursomeIdsTEMP || foursomeIdsTEMP.length === 0) {
    return members;
  }

  const ordered: T[] = [];
  const used = new Set<string>();

  for (const group of foursomeIdsTEMP) {
    let displayOrder: string[];
    if (group.length === 4) {
      // Team A = [group[0], group[3]], Team B = [group[1], group[2]]
      // Order: Team1-A, Team1-B, Team2-A, Team2-B
      displayOrder = [group[0], group[3], group[1], group[2]];
    } else if (group.length === 3) {
      // Team A = [group[0], group[2]], loneA = group[1]
      // Order: Team1-A, Team1-B, lone-A
      displayOrder = [group[0], group[2], group[1]];
    } else {
      displayOrder = [...group];
    }

    for (const id of displayOrder) {
      if (id && !used.has(id)) {
        const member = members.find((m) => m._id === id);
        if (member) {
          ordered.push(member);
          used.add(id);
        }
      }
    }
  }

  // Append any members not covered by foursomeIdsTEMP (e.g. no pairing set)
  for (const member of members) {
    if (member._id && !used.has(member._id)) {
      ordered.push(member);
    }
  }

  return ordered;
}

/**
 * Maps members to playerScores with optional memberScorecard enrichment.
 * Used in both score-entry and simple-score-entry.
 */
/**
 * @param members Array of Member
 * @param memberScorecards Optional Map of memberId to Scorecard
 * @param enrich Optional callback: (member, memberScorecard) => { course, tees, teeAbreviation, rating, slope }
 */
export function mapMembersToPlayerScores(
  members: Member[],
  memberScorecards?: Map<string, Scorecard>,
): any[] {
  return members.map((member) => {
    const playerScore: any = {
      member,
      totalScore: null,
      scores: [],
      differentialForRound: 0, // Default value
      frontNine: 0, // Default value
      backNine: 0, // Default value
      total: 0, // Default value
      netScore: 0, // Default value
      wonIndo: false, // Default value
      wonOneBall: false, // Default value
      wonTwoBall: false, // Default value
    };
    return playerScore;
  });
}
