export interface Member {
  // id?: string;
  _id?: string;
  firstName: string;
  lastName: string | null;
  usgaIndex?: number;
  lastDatePlayed?: string;
  scorecardsId?: string[];
  user: string;
  Email: string;
  hidden?: boolean;
  fullName?: string;
  fullNameR?: string;
}
