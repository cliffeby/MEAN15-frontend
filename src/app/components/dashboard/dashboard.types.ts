export interface ScoreWithMember {
  score: number;
  netScore: number;
  memberName: string;
  datePlayed: string;
}

export interface FrequentPlayer {
  memberName: string;
  rounds: number;
  memberId: string;
}

export interface DashboardData {
  totalMembers: number;
  groupsThisYear: number;
  matchesThisYear: number;
  matchesPast12Months: number;
  lowestNetScore: ScoreWithMember | null;
  highestNetScore: ScoreWithMember | null;
  topFrequentPlayers: FrequentPlayer[];
}