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
    const playerScore: any = {};
  });
}
