export interface Member {
  _id?: string;
  firstName: string;
  lastName: string | null;
  usgaIndex?: number;
  handicap?: number;
  GHIN?: string;
  lastDatePlayed?: string;
  scorecardsId?: string[];
  // user?: string;
  author?: {
    id: string;
    email: string;
    name: string;
  };
  Email: string;
  hidden?: boolean;
  fullName?: string;
  fullNameR?: string;
}
