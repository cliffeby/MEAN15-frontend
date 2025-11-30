import { Injectable } from '@angular/core';
import { computed, Signal } from '@angular/core';
import { Member } from '../models/member';
import { Score } from '../models/score';
import { Match } from '../models/match';
import { ScoreWithMember, FrequentPlayer } from '../components/dashboard/dashboard.types';
import { MemberUtils } from '../utils/member.utils';

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
        const matchDate = new Date(match.datePlayed ?? '');
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
        const matchDate = new Date(match.datePlayed ?? '');
        return matchDate >= twelveMonthsAgo && matchDate <= currentDate;
      }).length;
    });
  }

  /**
   * Find the lowest net score across all scores
   */
  findLowestNetScore(scores: Signal<Score[]>): Signal<number> {
    return computed(() => {
      const scoresArray = scores();
      return Math.min(...scoresArray.map(score => score.score || 0));
    });
  }

  /**
   * Find the highest net score across all scores
   */
  findHighestNetScore(scores: Signal<Score[]>): Signal<number> {
    return computed(() => {
      const scoresArray = scores();
      return Math.max(...scoresArray.map(score => score.score || 0));
    });
  }

  /**
   * Calculate the average net score
   */
  calculateAverageNetScore(scores: Signal<Score[]>): Signal<number> {
    return computed(() => {
      const scoresArray = scores();
      const total = scoresArray.reduce((acc, score) => acc + (score.score || 0), 0);
      return scoresArray.length > 0 ? total / scoresArray.length : 0;
    });
  }

  /**
   * Get the top N frequent players
   */
  getTopNFrequentPlayers(scores: Signal<Score[]>, members: Signal<Member[]>, n: number): Signal<FrequentPlayer[]> {
    return computed(() => {
      const scoresArray = scores();
      const membersArray = members();

      const playerFrequency = scoresArray.reduce((acc, score) => {
        const member = membersArray.find(m => String(m._id) === String(score.memberId));
        // const member = membersArray.find(member => member.id === score.memberId);
        if (member && member._id) {
          acc[member._id] = (acc[member._id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return Object.keys(playerFrequency)
        .map(memberId => {
          const member = membersArray.find(m => m._id === memberId);
          return {
            memberId: memberId,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
            frequency: playerFrequency[memberId],
            rounds: playerFrequency[memberId],
          };
        })
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, n);
    });
  }

  /**
     * Get the score details of a specific member
     * Requires access to members signal to get member names.
     */
    getMemberScoreDetails(scores: Signal<Score[]>, members: Signal<Member[]>, memberId: string): Signal<ScoreWithMember[]> {
      return computed(() => {
        const scoresArray = scores();
        const membersArray = members();
        return scoresArray
          .filter(score => score.memberId === memberId)
          .map(score => {
            const member = membersArray.find(m => m._id === score.memberId);
            return {
              ...score,
              memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
              netScore: score.score || 0,
              datePlayed: score.datePlayed ?? '', // Ensure datePlayed is always a string
            };
          });
      });
    }

  /**
   * Get the average score of a specific member
   */
  getMemberAverageScore(scores: Signal<Score[]>, memberId: number): Signal<number> {
    return computed(() => {
      const scoresArray = scores();
      const memberScores = scoresArray.filter(score => String(score.memberId) === String(memberId));
      const total = memberScores.reduce((acc, score) => acc + (score.score || 0), 0);
      return memberScores.length > 0 ? total / memberScores.length : 0;
    });
  }

  /**
   * Get the trend of a member's scores over time
   */
  getMemberScoreTrend(scores: Signal<Score[]>, memberId: number): Signal<{ date: Date, netScore: number }[]> {
    return computed(() => {
      const scoresArray = scores();
      return scoresArray
        .filter(score => String(score.memberId) === String(memberId))
        .map(score => ({
          date: new Date(score.datePlayed ?? ''),
          netScore: score.score || 0
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    });
  }

  /**
   * Get the distribution of scores across all members
   */
  getScoreDistribution(scores: Signal<Score[]>): Signal<{ scoreRange: string, count: number }[]> {
    return computed(() => {
      const scoresArray = scores();
      const distribution: { [key: string]: number } = {};
      
      scoresArray.forEach(score => {
        const range = this.getScoreRange(score.score || 0);
        distribution[range] = (distribution[range] || 0) + 1;
      });
      
      return Object.keys(distribution).map(range => ({
        scoreRange: range,
        count: distribution[range]
      }));
    });
  }

  /**
   * Helper method to determine the score range
   */
  private getScoreRange(score: number): string {
    if (score < 60) {
      return '0-59';
    } else if (score < 70) {
      return '60-69';
    } else if (score < 80) {
      return '70-79';
    } else if (score < 90) {
      return '80-89';
    } else {
      return '90-100';
    }
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
          score: score.score || 0,
          netScore: netScore,
          memberName: memberName,
          datePlayed: score.datePlayed || ''
        };

        if (!highestScore || netScore > highestScore.netScore) {
          highestScore = scoreData;
        }
      }

      console.log('Highest net score result:', highestScore);
      return highestScore;
    });
  }
}
