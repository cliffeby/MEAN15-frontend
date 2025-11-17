import { Member } from './member';

export interface PlayerScore {
  member: Member;
  scores: (number | null)[];
  frontNine: number;
  backNine: number;
  total: number;
  handicap: number;
  netScore: number;
  existingScoreId?: string;
}