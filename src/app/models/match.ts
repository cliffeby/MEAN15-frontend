export interface Match {
  id?: string;
  _id?: string;
  name: string;
  scorecardId?: string;
  scGroupName?: string;
  players?: number;
  status: string;
  lineUps?: string[]; // Array of member IDs
  datePlayed?: string;
  user: string;
  createdAt?: string;
  updatedAt?: string;
}