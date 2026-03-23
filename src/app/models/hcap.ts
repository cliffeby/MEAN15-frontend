export interface HCap {
  name: string;
  postedScore: number;
  datePlayed: Date;
  usgaIndexB4Round?: number;
  rochIndexB4Round: number;
  usgaIndexAfterRound?: number;
  rochIndexAfterRound: number;
  differentialForRound: number | undefined;
  courseAdjustedDifferentialForRound: number | undefined;
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
  author?: {
    id: string;
    email: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  noScores?: boolean;
}
