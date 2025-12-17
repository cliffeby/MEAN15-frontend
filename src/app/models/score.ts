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
  usgaIndexForTodaysScore?: number;
  handicap: number;
  wonTwoBall?: boolean;
  wonOneBall?: boolean;
  wonIndo?: boolean;
  isPaired?: boolean;
  isScored?: boolean;
  matchId?: string | {
    _id?: string;
    name: string;
    datePlayed?: string;
    status?: string;
  };
  memberId?: string | {
    _id?: string;
    name: string;
    email?: string;
  };
  scorecardId?: string | {
    _id?: string;
    name: string;
  };
  scSlope?: number;
  scRating?: number;
  scPars?: number[];
  scHCaps?: number[];
  scName?: string;
  datePlayed?: string;
  foursomeIds?: string[];
  partnerIds?: string[];
  user: string;
  author?: {
    id: string;
    email: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}