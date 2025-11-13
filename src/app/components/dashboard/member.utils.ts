import { Member } from '../../models/member';
import { Score } from '../../models/score';

/**
 * Utility functions for resolving member information from various data structures
 */
export class MemberUtils {
  
  /**
   * Resolves member name from a score object that may have populated or unpopulated memberId
   */
  static resolveMemberName(score: Score, members: Member[]): string {
    if (!score.memberId) {
      return 'Unknown Member';
    }

    // Handle populated memberId (object with member data)
    if (typeof score.memberId === 'object') {
      const populatedMember = score.memberId as any;
      if (populatedMember.firstName) {
        return `${populatedMember.firstName} ${populatedMember.lastName || ''}`.trim();
      }
      if (populatedMember.name) {
        return populatedMember.name;
      }
      return 'Unknown Member';
    }

    // Handle string memberId (need to find member in members array)
    if (typeof score.memberId === 'string') {
      const member = members.find(m => 
        m._id === score.memberId || m.id === score.memberId
      );
      if (member) {
        return `${member.firstName} ${member.lastName || ''}`.trim();
      }
    }

    return 'Unknown Member';
  }

  /**
   * Resolves member ID from a score object that may have populated or unpopulated memberId
   */
  static resolveMemberId(score: Score): string {
    if (!score.memberId) {
      return '';
    }

    if (typeof score.memberId === 'object') {
      const populatedMember = score.memberId as any;
      return populatedMember._id || populatedMember.id || '';
    }

    if (typeof score.memberId === 'string') {
      return score.memberId;
    }

    return '';
  }

  /**
   * Validates that a score has valid score and handicap data
   */
  static isValidScore(score: Score): boolean {
    return !!(score.score && score.handicap !== undefined);
  }

  /**
   * Calculates net score from gross score and handicap
   */
  static calculateNetScore(score: Score): number {
    return score.score - (score.handicap || 0);
  }
}