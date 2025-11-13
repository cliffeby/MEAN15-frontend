export interface PrintablePlayer {
  member: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  handicap: number;
}