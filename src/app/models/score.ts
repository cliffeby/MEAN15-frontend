export interface Score {
  _id?: string;
  name: string;
  score: number;
  postedScore: number;
  scores: number[];
  scoresToPost: number[];
  scoringMethod: string;
  scoreRecordType: 'byHole' | 'total' | 'differential';
  usgaIndexB4Round?: number;
  rochIndexB4Round: number;
  usgaIndexAfterRound?: number;
  rochIndexAfterRound: number;
  differentialForRound: number | undefined;
  courseAdjustedDifferentialForRound: number | undefined;
  netScore: number;
  wonTwoBall?: boolean;
  wonOneBall?: boolean;
  wonIndo?: boolean;
  isPaired?: boolean;
  isScored?: boolean;
  matchId?:
    | string
    | {
        _id?: string;
        name: string;
        datePlayed?: string;
        status?: string;
      };
  memberId?:
    | string
    | {
        _id?: string;
        name: string;
        email?: string;
      };
  scorecardId?:
    | string
    | {
        _id?: string;
        tees: string;
      };
  scPar?: number;
  scSlope?: number;
  scRating?: number;
  scPars?: number[];
  scHCaps?: number[];
  scTees?: string;
  scCourse?: string;
  teeAbreviation?: string;
  datePlayed?: string;
  foursomeIds?: string[];
  partnerIds?: string[];
  author?: {
    id: string;
    email: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
  newHCap?: number; // <-- Add newHCap property for reporting
}

import { Member } from './member';
import { Scorecard } from './scorecard.interface';
export interface SimplePlayerScore {
  creating?: boolean;
  postedScore?: number;
  member: Member;
  totalScore: number | null;
  scores: (number | null)[];
  usgaIndexB4Round: number; // Updated to make it required to align with PlayerScore
  rochIndexB4Round: number;
  usgaIndexAfterRound?: number;
  rochIndexAfterRound?: number;
  differentialForRound: number; // Updated to make it required to align with PlayerScore
  courseAdjustedDifferentialForRound?: number | undefined;
  netScore: number;
  wonIndo: boolean;
  wonOneBall: boolean;
  wonTwoBall: boolean;
  existingScoreId?: string;
  scorecardId?: string;
  teeAbreviation?: string;
  scRating?: number;
  scSlope?: number;
  scTees?: string;
  memberScorecard?: Scorecard;
  frontNine: number; // Added to match PlayerScore
  backNine: number; // Added to match PlayerScore
  total: number; // Added to match PlayerScore
}

export interface ScoresApiResponse {
  success: boolean;
  count: number;
  scores: Score[];
}
