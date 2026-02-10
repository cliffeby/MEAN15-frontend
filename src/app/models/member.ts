import type { Score } from './score';

export interface Member {
  _id?: string;
  firstName: string;
  lastName: string | null;
  usgaIndex?: number;
  handicap?: number;
  GHIN?: string;
  lastDatePlayed?: string;
  scorecardsId?: string[];
  author?: {
    id: string;
    email: string;
    name: string;
  };
  Email: string;
  hidden?: boolean;
  fullName?: string;
  fullNameR?: string;
  name?: string;
  scores?: Score[]; // <-- Add scores property for member's scores
  newHCap?: number; // <-- Add newHCap property for reporting
}
