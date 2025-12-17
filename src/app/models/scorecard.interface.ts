export interface Scorecard {
  _id?: string;
  groupName?: string;
  name?: string;
  rating?: number;
  slope?: number;
  parInputString?: string;
  pars?: number[];
  par?: number;
  hCapInputString?: string;
  hCaps?: number[];
  yardsInputString?: string;
  yards?: number[];
  scorecardsId?: string[];
  scorecardId?: string;
  user?: string;
  author?: {
    id: string;
    email: string;
    name: string;
  };
  courseTeeName?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface MatchData {
  _id: string;
  description: string;
  course: {
    name: string;
  };
  teeTime: string;
  members: string[]; // Array of member IDs
}

export interface ScorecardData {
  _id: string;
  course: string;
  courseName: string;
  tees: string;
  pars: number[];
  hCaps: number[];
  distances: number[];
}

export interface PdfGenerationOptions {
  filename?: string;
  openInNewWindow?: boolean;
}