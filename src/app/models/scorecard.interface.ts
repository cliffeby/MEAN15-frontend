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