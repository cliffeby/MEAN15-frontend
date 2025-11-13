import { Injectable } from '@angular/core';
import { computed, Signal } from '@angular/core';
import { Member } from '../../models/member';
import { Score } from '../../models/score';
import { Match } from '../../models/match';
import { ScoreWithMember, FrequentPlayer } from './dashboard.types';
import { MemberUtils } from './member.utils';

/**
 * Service responsible for computing dashboard statistics
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardStatsService {
  
  /**
   * Calculate number of groups/matches this year
   */
  calculateGroupsThisYear(matches: Signal<Match[]>, currentYear: number): Signal<number> {
    return computed(() => {
      const matchesArray = matches();
      return matchesArray.filter(match => {
        const matchDate = new Date(match.datePlayed || '');
        return matchDate.getFullYear() === currentYear;
      }).length;
    });
  }

  /**
   * Calculate number of matches in the past 12 months
   */
  calculateMatchesPast12Months(matches: Signal<Match[]>, currentDate: Date): Signal<number> {
    return computed(() => {
      const matchesArray = matches();
      const twelveMonthsAgo = new Date(
        currentDate.getFullYear() - 1, 
        currentDate.getMonth(), 
        currentDate.getDate()
      );
      
      return matchesArray.filter(match => {
        const matchDate = new Date(match.datePlayed || '');
        return matchDate >= twelveMonthsAgo && matchDate <= currentDate;
      }).length;
    });
  }

  /**
   * Find the lowest net score across all scores
   */
  calculateLowestNetScore(scores: Signal<Score[]>, members: Signal<Member[]>): Signal<ScoreWithMember | null> {
    return computed(() => {
      const scoresArray = scores();
      const membersArray = members();
      
      console.log('Computing lowest net score:', { 
        scores: scoresArray.length, 
        members: membersArray.length 
      });
      
      if (scoresArray.length === 0) return null;

      let lowestScore: ScoreWithMember | null = null;

      for (const score of scoresArray) {
        if (!MemberUtils.isValidScore(score)) continue;

        const netScore = MemberUtils.calculateNetScore(score);
        const memberName = MemberUtils.resolveMemberName(score, membersArray);
        
        console.log('Found score for lowest:', { 
          netScore, 
          memberName, 
          score: score.score, 
          handicap: score.handicap 
        });
        
        const scoreData: ScoreWithMember = {
          score: netScore,
          netScore: netScore,
          memberName: memberName,
          datePlayed: score.datePlayed || ''
        };

        if (!lowestScore || netScore < lowestScore.score) {
          lowestScore = scoreData;
        }
      }

      console.log('Lowest net score result:', lowestScore);
      return lowestScore;
    });
  }

  /**
   * Find the highest net score across all scores
   */
  calculateHighestNetScore(scores: Signal<Score[]>, members: Signal<Member[]>): Signal<ScoreWithMember | null> {
    return computed(() => {
      const scoresArray = scores();
      const membersArray = members();
      
      console.log('Computing highest net score:', { 
        scores: scoresArray.length, 
        members: membersArray.length 
      });
      
      if (scoresArray.length === 0) return null;

      let highestScore: ScoreWithMember | null = null;

      for (const score of scoresArray) {
        if (!MemberUtils.isValidScore(score)) continue;

        const netScore = MemberUtils.calculateNetScore(score);
        const memberName = MemberUtils.resolveMemberName(score, membersArray);
        
        console.log('Found score for highest:', { 
          netScore, 
          memberName, 
          score: score.score, 
          handicap: score.handicap 
        });
        
        const scoreData: ScoreWithMember = {
          score: netScore,
          netScore: netScore,
          memberName: memberName,
          datePlayed: score.datePlayed || ''
        };

        if (!highestScore || netScore > highestScore.score) {
          highestScore = scoreData;
        }
      }

      console.log('Highest net score result:', highestScore);
      return highestScore;
    });
  }

  /**
   * Calculate the most frequent players in the past 12 months
   */
  calculateTopFrequentPlayers(scores: Signal<Score[]>, members: Signal<Member[]>, currentDate: Date): Signal<FrequentPlayer[]> {
    return computed(() => {
      const scoresArray = scores();
      const membersArray = members();
      
      if (scoresArray.length === 0) return [];

      // Get scores from the past 12 months
      const twelveMonthsAgo = new Date(
        currentDate.getFullYear() - 1, 
        currentDate.getMonth(), 
        currentDate.getDate()
      );
      
      const recentScores = scoresArray.filter(score => {
        const scoreDate = new Date(score.datePlayed || '');
        return scoreDate >= twelveMonthsAgo && scoreDate <= currentDate;
      });

      // Count rounds per member
      const memberRounds: { [key: string]: FrequentPlayer } = {};
      
      for (const score of recentScores) {
        const memberId = MemberUtils.resolveMemberId(score);
        const memberName = MemberUtils.resolveMemberName(score, membersArray);
        
        if (memberId) {
          if (!memberRounds[memberId]) {
            memberRounds[memberId] = { memberName, rounds: 0, memberId };
          }
          memberRounds[memberId].rounds++;
        }
      }

      // Convert to array and sort by rounds descending
      const sortedPlayers = Object.values(memberRounds)
        .sort((a, b) => b.rounds - a.rounds)
        .slice(0, 5); // Top 5 players

      console.log('Top frequent players:', sortedPlayers);
      return sortedPlayers;
    });
  }
}