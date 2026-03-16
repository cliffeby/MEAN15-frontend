import { SimplePlayerScore } from '../models/score'; // Adjusted path if the correct file is in 'models' under current directory
import { Match } from '../models/match';
import { Scorecard } from '../models/scorecard.interface';
import { Score } from '../models/score';
import { HandicapCalculationService } from '../services/handicap-calculation.service';
// import { calculateDifferentialToday } from './score-utils';

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
  entryMode: 'totalScore' | 'differential' | 'byHole',
  author: any,
  // handicapCalculationService: HandicapCalculationService,
): Partial<Score> {
  return {
    name: `${playerScore.member.firstName} ${playerScore.member.lastName || ''}`.trim(),
    score: playerScore.totalScore || 0,
    postedScore: playerScore.totalScore || 0,
    scores: (playerScore.scores ? playerScore.scores.map(s => s == null ? 0 : s) : new Array(18).fill(0)),
    scoresToPost: (playerScore.scores ? playerScore.scores.map(s => s == null ? 0 : s) : new Array(18).fill(0)),
    scoreRecordType: entryMode === 'differential' ? 'differential' : entryMode === 'byHole' ? 'byHole' : 'total',
    usgaIndexB4Round: playerScore.member.usgaIndexB4Round,
    rochIndexB4Round: playerScore.member.rochIndexB4Round,
    // usgaCapToday: handicapCalculationService.calculateCourseHandicapFromIndex(
    //   playerScore.member.usgaIndexB4Round || 0,
    //   scorecard?.slope || 113,
    //   scorecard?.rating || 72,
    //   scorecard?.par || 72) || 0,

    matchId: match?._id,
    memberId: playerScore.member._id,
    scorecardId: playerScore.scorecardId,
    scSlope: playerScore.scSlope,
    scRating: playerScore.scRating,
    scPars: scorecard?.pars,
    scHCaps: scorecard?.hCaps,
    scTees: playerScore.scTees,
    teeAbreviation: playerScore.teeAbreviation,
    scCourse: scorecard?.course,
    datePlayed: match?.datePlayed,
    author,
    isScored: true,
    wonIndo: playerScore.wonIndo,
    wonOneBall: playerScore.wonOneBall,
    wonTwoBall: playerScore.wonTwoBall,
    // rochCapToday: playerScore.rochCapToday, // Added rochCapToday to the returned object
    // usgaCapToday: playerScore.usgaCapToday, // Added usgaCapToday to the returned object
  };
}
