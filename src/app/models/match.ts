export interface PopulatedScorecard {
  _id: string;
  course: string;
  name?: string;
  slope?: number;
  rating?: number;
}

export interface Match {
  _id?: string;
  name: string;
  scorecardId?: string | PopulatedScorecard;
  scGroupName?: string;
  players?: number;
  status: string;
  lineUps?: string[]; // Array of member IDs
  foursomeIdsTEMP?: string[][];
  partnerIdsTEMP?: string[][];
  datePlayed?: string;
  // user?: string;
  author?: {
    id: string;
    email: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}