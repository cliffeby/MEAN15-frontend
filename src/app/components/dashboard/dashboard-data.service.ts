import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { MemberService } from '../../services/memberService';
import { ScoreService } from '../../services/scoreService';
import { MatchService } from '../../services/matchService';
import { Member } from '../../models/member';
import { Score } from '../../models/score';
import { Match } from '../../models/match';

export interface DashboardApiResponse {
  members: Member[];
  scores: Score[];
  matches: Match[];
}

/**
 * Service responsible for loading dashboard data from APIs
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardDataService {
  
  constructor(
    private memberService: MemberService,
    private scoreService: ScoreService,
    private matchService: MatchService
  ) {}

  /**
   * Load all dashboard data in parallel
   */
  loadDashboardData(): Observable<DashboardApiResponse> {
    return new Observable(subscriber => {
      forkJoin({
        members: this.memberService.getAll(),
        scores: this.scoreService.getAll(),
        matches: this.matchService.getAll()
      }).subscribe({
        next: ({ members, scores, matches }) => {
          console.log('Dashboard data loaded:', {
            members: members?.length,
            scores: scores?.length || (scores as any)?.scores?.length,
            matches: matches?.length || (matches as any)?.matches?.length
          });

          // Normalize data from potentially wrapped API responses
          const normalizedData: DashboardApiResponse = {
            members: this.normalizeMembers(members),
            scores: this.normalizeScores(scores),
            matches: this.normalizeMatches(matches)
          };

          subscriber.next(normalizedData);
          subscriber.complete();
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          subscriber.error(error);
        }
      });
    });
  }

  /**
   * Normalize members data - handle wrapped responses
   */
  private normalizeMembers(members: any): Member[] {
    if (Array.isArray(members)) {
      return members;
    }
    if (members?.members && Array.isArray(members.members)) {
      return members.members;
    }
    return [];
  }

  /**
   * Normalize scores data - handle wrapped responses
   */
  private normalizeScores(scores: any): Score[] {
    if (Array.isArray(scores)) {
      return scores;
    }
    if (scores?.scores && Array.isArray(scores.scores)) {
      console.log('Setting scores array from wrapped response');
      if (scores.scores.length > 0) {
        console.log('Sample score structure:', {
          score: scores.scores[0].score,
          handicap: scores.scores[0].handicap,
          memberId: scores.scores[0].memberId,
          memberIdType: typeof scores.scores[0].memberId
        });
      }
      return scores.scores;
    }
    return [];
  }

  /**
   * Normalize matches data - handle wrapped responses
   */
  private normalizeMatches(matches: any): Match[] {
    if (Array.isArray(matches)) {
      return matches;
    }
    if (matches?.matches && Array.isArray(matches.matches)) {
      return matches.matches;
    }
    return [];
  }
}