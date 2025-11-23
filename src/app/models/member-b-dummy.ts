// This is a special member used for pairing when the lineup has an odd number of players.
import { Member } from './member';

export const MEMBER_B_DUMMY: Member = {
  _id: '00000000000000000000B001',
  firstName: 'B.Dummy',
  lastName: '',
  usgaIndex: 0, // Will be set dynamically
  user: 'system',
  Email: '',
  fullName: 'B.Dummy',
  fullNameR: 'B.Dummy',
};
