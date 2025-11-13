import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../services/authService';
import { MemberService } from '../../services/memberService';
import { ScoreService } from '../../services/scoreService';
import { MatchService } from '../../services/matchService';
import { Member } from '../../models/member';
import { Score } from '../../models/score';
import { Match } from '../../models/match';

interface ScoreWithMember {
  score: number;
  netScore: number;
  memberName: string;
  datePlayed: string;
}

interface FrequentPlayer {
  memberName: string;
  rounds: number;
  memberId: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    MatToolbarModule, 
    MatButtonModule, 
    MatCardModule, 
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit {
  router = inject(Router);
  auth = inject(AuthService);
  memberService = inject(MemberService);
  scoreService = inject(ScoreService);
  matchService = inject(MatchService);
  snackBar = inject(MatSnackBar);

  // Basic signals
  totalMembers = signal(0);
  allMembers = signal<Member[]>([]);
  allScores = signal<Score[]>([]);
  allMatches = signal<Match[]>([]);

  // Date calculations
  currentDate = new Date();
  currentYear = this.currentDate.getFullYear();
  twelveMonthsAgo = new Date(this.currentDate.getFullYear() - 1, this.currentDate.getMonth(), this.currentDate.getDate());

  // Computed statistics
  groupsThisYear = computed(() => {
    const matches = this.allMatches();
    const thisYear = this.currentYear;
    return matches.filter(match => {
      const matchDate = new Date(match.datePlayed || '');
      return matchDate.getFullYear() === thisYear;
    }).length;
  });

  matchesThisYear = computed(() => {
    const matches = this.allMatches();
    const thisYear = this.currentYear;
    return matches.filter(match => {
      const matchDate = new Date(match.datePlayed || '');
      return matchDate.getFullYear() === thisYear;
    }).length;
  });

  matchesPast12Months = computed(() => {
    const matches = this.allMatches();
    const now = this.currentDate;
    const twelveMonthsAgo = this.twelveMonthsAgo;
    
    return matches.filter(match => {
      const matchDate = new Date(match.datePlayed || '');
      return matchDate >= twelveMonthsAgo && matchDate <= now;
    }).length;
  });

  lowestNetScore = computed(() => {
    const scores = this.allScores();
    const members = this.allMembers();
    
    console.log('Computing lowest net score:', { scores: scores.length, members: members.length });
    
    if (scores.length === 0) return null;

    let lowestScore: ScoreWithMember | null = null;

    for (const score of scores) {
      if (score.score && score.handicap !== undefined) {
        const netScore = score.score - score.handicap;
        
        // Handle populated memberId or find member by ID
        let memberName = 'Unknown Member';
        if (score.memberId) {
          if (typeof score.memberId === 'object') {
            // memberId is populated with member data
            const populatedMember = score.memberId as any;
            if (populatedMember.firstName) {
              memberName = `${populatedMember.firstName} ${populatedMember.lastName || ''}`.trim();
            } else if (populatedMember.name) {
              memberName = populatedMember.name;
            }
          } else if (typeof score.memberId === 'string') {
            // memberId is just an ID, find the member
            const member = members.find(m => m._id === score.memberId || m.id === score.memberId);
            if (member) {
              memberName = `${member.firstName} ${member.lastName || ''}`.trim();
            }
          }
        }
        
        console.log('Found score for lowest:', { netScore, memberName, score: score.score, handicap: score.handicap });
        
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
    }

    console.log('Lowest net score result:', lowestScore);
    return lowestScore;
  });

  highestNetScore = computed(() => {
    const scores = this.allScores();
    const members = this.allMembers();
    
    console.log('Computing highest net score:', { scores: scores.length, members: members.length });
    
    if (scores.length === 0) return null;

    let highestScore: ScoreWithMember | null = null;

    for (const score of scores) {
      if (score.score && score.handicap !== undefined) {
        const netScore = score.score - score.handicap;
        
        // Handle populated memberId or find member by ID
        let memberName = 'Unknown Member';
        if (score.memberId) {
          if (typeof score.memberId === 'object') {
            // memberId is populated with member data
            const populatedMember = score.memberId as any;
            if (populatedMember.firstName) {
              memberName = `${populatedMember.firstName} ${populatedMember.lastName || ''}`.trim();
            } else if (populatedMember.name) {
              memberName = populatedMember.name;
            }
          } else if (typeof score.memberId === 'string') {
            // memberId is just an ID, find the member
            const member = members.find(m => m._id === score.memberId || m.id === score.memberId);
            if (member) {
              memberName = `${member.firstName} ${member.lastName || ''}`.trim();
            }
          }
        }
        
        console.log('Found score for highest:', { netScore, memberName, score: score.score, handicap: score.handicap });
        
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
    }

    console.log('Highest net score result:', highestScore);
    return highestScore;
  });

  topFrequentPlayers = computed(() => {
    const scores = this.allScores();
    const members = this.allMembers();
    
    if (scores.length === 0) return [];

    // Get scores from the past 12 months
    const twelveMonthsAgo = this.twelveMonthsAgo;
    const now = this.currentDate;
    
    const recentScores = scores.filter(score => {
      const scoreDate = new Date(score.datePlayed || '');
      return scoreDate >= twelveMonthsAgo && scoreDate <= now;
    });

    // Count rounds per member
    const memberRounds: { [key: string]: { memberName: string; rounds: number; memberId: string } } = {};
    
    for (const score of recentScores) {
      let memberId: string = '';
      let memberName = 'Unknown Member';
      
      if (score.memberId) {
        if (typeof score.memberId === 'object') {
          // memberId is populated with member data
          const populatedMember = score.memberId as any;
          memberId = populatedMember._id || populatedMember.id || '';
          if (populatedMember.firstName) {
            memberName = `${populatedMember.firstName} ${populatedMember.lastName || ''}`.trim();
          } else if (populatedMember.name) {
            memberName = populatedMember.name;
          }
        } else if (typeof score.memberId === 'string') {
          // memberId is just an ID, find the member
          memberId = score.memberId;
          const member = members.find(m => m._id === memberId || m.id === memberId);
          if (member) {
            memberName = `${member.firstName} ${member.lastName || ''}`.trim();
          }
        }
      }
      
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

  constructor() {
    console.log('Dashboard constructor - User role:', this.auth.role);
  }

  ngOnInit() {
    if (this.auth.role === 'admin') {
      this.loadDashboardData();
    }
  }

  private loadDashboardData() {
    console.log('Loading dashboard data...');
    
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

        // Handle members
        const membersArray = Array.isArray(members) ? members : (members as any)?.members || [];
        this.allMembers.set(membersArray);
        this.totalMembers.set(membersArray.length);

        // Handle scores - might be wrapped in response object
        let scoresArray: Score[] = [];
        if (Array.isArray(scores)) {
          scoresArray = scores;
        } else if ((scores as any)?.scores && Array.isArray((scores as any).scores)) {
          scoresArray = (scores as any).scores;
        }
        console.log('Setting scores array:', scoresArray.slice(0, 3)); // Log first 3 scores
        if (scoresArray.length > 0) {
          console.log('Sample score structure:', {
            score: scoresArray[0].score,
            handicap: scoresArray[0].handicap,
            memberId: scoresArray[0].memberId,
            memberIdType: typeof scoresArray[0].memberId
          });
        }
        this.allScores.set(scoresArray);

        // Handle matches - might be wrapped in response object  
        let matchesArray: Match[] = [];
        if (Array.isArray(matches)) {
          matchesArray = matches;
        } else if ((matches as any)?.matches && Array.isArray((matches as any).matches)) {
          matchesArray = (matches as any).matches;
        }
        this.allMatches.set(matchesArray);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.snackBar.open('Error loading dashboard data', 'Close', { duration: 3000 });
      }
    });
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }
}
