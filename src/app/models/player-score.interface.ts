import { Member } from './member';

export interface PlayerScore {
  member: Member;
  scores: (number | null)[];
  frontNine: number;
  backNine: number;
  total: number;
  totalScore: number | null;
  differential: number | null;
  handicap: number;
  netScore: number;
  wonIndo: boolean;
  wonOneBall: boolean;
  wonTwoBall: boolean;
  existingScoreId?: string;
  scorecardId?: string;
  // Scorecard enrichment fields
  tees?: string;
  course?: string;
  teeAbreviation?: string;
  rating?: number;
  slope?: number;
}

