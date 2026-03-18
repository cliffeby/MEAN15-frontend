export interface PrintablePlayer {
  member: {
    _id: string;
    firstName: string;
    lastName: string;
    Email?: string;
  };
  rochIndex: number;
  teeAbreviation: string;
  scores?: (number | null)[];
}