export interface Score {
  _id?: string;
  name: string;
  score: number;
  postedScore: number;
  scores: number[];
  scoresToPost: number[];
  scoringMethod: string;
  scoreRecordType: 'byHole' | 'total' | 'differential';
  usgaIndex?: number;
  usgaDifferentialToday: number | undefined;
  rochDifferentialToday: number | undefined;
  othersDifferentialToday: number | undefined;
  handicap: number;
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
  // teeAbreviation?: string;
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
}

import { Member } from './member';
import { Scorecard } from './scorecard.interface';
export interface SimplePlayerScore {
  creating?: boolean;
  postedScore?: number;
  member: Member;
  totalScore: number | null;
  scores: (number | null)[];
  differential: number | null;
  usgaDifferentialToday: number | undefined;
  rochDifferentialToday: number | undefined;
  othersDifferentialToday: number | undefined;
  handicap: number;
  netScore: number;
  wonIndo: boolean;
  wonOneBall: boolean;
  wonTwoBall: boolean;
  existingScoreId?: string;
  scorecardId?: string;
  teeAbreviation?: string;
  rating?: number;
  slope?: number;
  tees?: string;
  memberScorecard?: Scorecard;
}

export interface ScoresApiResponse {
  success: boolean;
  count: number;
  scores: Score[];
}
