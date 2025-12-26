export interface HCap {
  name: string;
  postedScore: number;
  currentHCap: number;
  newHCap: string;
  datePlayed: Date;
  usgaIndexForTodaysScore: {
    type: number;
    min: [-10, 'USGA Index for today cannot be less than -10.0'];
    max: [54, 'USGA Index for today cannot be greater than 54.0'];
  };
  handicap: number;
  scoreId: string;
  scorecardId: string;
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
}
