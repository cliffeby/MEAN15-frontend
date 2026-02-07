import { SimplePlayerScore } from '../models/score'; // Adjusted path if the correct file is in 'models' under current directory
import { Match } from '../models/match';
import { Scorecard } from '../models/scorecard.interface';
import { Score } from '../models/score';
import { calculateUSGADifferentialToday } from './score-utils';

/**
 * Builds a score data object for saving, given player, match, scorecard, entry mode, and author.
 * @param playerScore SimplePlayerScore
 * @param match Match
 * @param scorecard Scorecard
 * @param entryMode 'totalScore' | 'differential'
 * @param author Author object
 * @returns Partial<Score>
 */
export function buildScoreData(
  playerScore: SimplePlayerScore,
  match: Match,
  scorecard: Scorecard,
  entryMode: 'totalScore' | 'differential',
  author: any
): Partial<Score> {
  return {
    name: `${playerScore.member.firstName} ${playerScore.member.lastName || ''}`.trim(),
    score: playerScore.totalScore || 0,
    postedScore: playerScore.totalScore || 0,
    scores: new Array(18).fill(0), // Empty hole scores for simple mode
    scoresToPost: new Array(18).fill(0),
    scoreRecordType: entryMode === 'differential' ? 'differential' : 'total',
    usgaIndex: playerScore.member.usgaIndex,
    handicap: playerScore.handicap,
    usgaDifferentialToday: calculateUSGADifferentialToday(
      playerScore.totalScore || 0,
      scorecard?.slope || 113,
      scorecard?.rating || 72
    ) || 0,
    rochDifferentialToday: calculateUSGADifferentialToday(
      playerScore.totalScore || 0,
      scorecard?.slope || 113,
      scorecard?.rating || 72
    ) || 0,
    othersDifferentialToday: playerScore.othersDifferentialToday || 0,
    matchId: match?._id,
    memberId: playerScore.member._id,
    scorecardId: playerScore.scorecardId,
    scSlope: playerScore.slope,
    scRating: playerScore.rating,
    scPars: scorecard?.pars,
    scHCaps: scorecard?.hCaps,
    scTees: playerScore.teeAbreviation,
    scCourse: scorecard?.course,
    datePlayed: match?.datePlayed,
    author,
    isScored: true,
    wonIndo: playerScore.wonIndo,
    wonOneBall: playerScore.wonOneBall,
    wonTwoBall: playerScore.wonTwoBall,
  };
}
