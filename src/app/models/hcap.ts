 export interface HCap {
    name: String,
    postedScore: Number,
    currentHCap: Number,
    newHCap: Number,
    datePlayed: Date,
    usgaIndexForTodaysScore: {
      type: Number,
      min: [-10, "USGA Index for today cannot be less than -10.0"],
      max: [54, "USGA Index for today cannot be greater than 54.0"]
    },
    handicap: Number
    scoreId: string,
    scorecardId: string,
    matchId: string,
    memberId: string,
    userId: string,
    createdAt: Date,
    updatedAt: Date
}
 