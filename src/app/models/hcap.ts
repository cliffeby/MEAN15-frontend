export interface HCap {
  name: string;
  postedScore: number;
  // currentHCap: number;
  // newHCap: string;
  datePlayed: Date;
  rochDifferentialForTodaysRound: number;
  usgaDifferentialForTodaysRound: number;
  rochIndexForThisRound: number;
  usgaIndexForThisRound: number;
  usgaIndexAfterTodaysScore: {
    type: number;
    min: [-10, 'USGA Index for today cannot be less than -10.0'];
    max: [54, 'USGA Index for today cannot be greater than 54.0'];
  };
  rochIndexAfterTodaysScore: {
    type: number;
    min: [-10, 'USGA Index for today cannot be less than -10.0'];
    max: [26, 'USGA Index for today cannot be greater than 26.0'];
  };
  rochHandicapForThisRound: number;
  usgaHandicapForThisRound: number;
  rochNewCap: number,
  usgaNewCap: number,
  // handicapDifferential: number;
  scoreId: string;
  scorecardId: string;
  scPar: number;
  scRating: number;
  scSlope: number;
  scCourse: string;
  scTees: string;
  teeAbreviation: string;
  matchId: string;
  memberId: string;
  // userId: string;
  author?: {
    id: string;
    email: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  noScores?: boolean;
}
