export interface Match {
  // id?: string;
  _id?: string;
  name: string;
  scorecardId?: string;
  scGroupName?: string;
  players?: number;
  status: string;
  lineUps?: string[]; // Array of member IDs
  foursomeIdsTEMP?: string[][];
  partnerIdsTEMP?: string[][];
  datePlayed?: string;
  user: string;
  createdAt?: string;
  updatedAt?: string;
}