import { environment } from '../../../environments/environment';

import { Component, inject, signal, computed, OnInit, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../services/authService';
import { MsalModule } from '@azure/msal-angular';
import { Member } from '../../models/member';
import { Score } from '../../models/score';
import { Match } from '../../models/match';
import { DashboardStatsService } from '../../services/dashboard-stats.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { ConfigurationService } from '../../services/configuration.service';
import { ScoreWithMember, FrequentPlayer } from './dashboard.types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    MatToolbarModule, 
    MatButtonModule, 
    MatCardModule, 
    MatSnackBarModule,
    MatIconModule,
    MsalModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, AfterViewInit {
  private router = inject(Router);
  auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private statsService = inject(DashboardStatsService);
  private dataService = inject(DashboardDataService);
  private configService = inject(ConfigurationService);

  // Data signals
  totalMembers = signal(0);
  allMembers = signal<Member[]>([]);
  allScores = signal<Score[]>([]);
  allMatches = signal<Match[]>([]);

  // DB type signal
  dbType = signal<string>('');
  dbName = signal<string>('');
  server = signal<string>('');

  // Date calculations
  public currentDate = new Date();
  public currentYear = this.currentDate.getFullYear();

  public twelveMonthsAgo = new Date(new Date().setMonth(new Date().getMonth() - 12));

  // Computed statistics using the stats service
  groupsThisYear = this.statsService.calculateGroupsThisYear(this.allMatches, this.currentYear);
  matchesThisYear = this.statsService.calculateGroupsThisYear(this.allMatches, this.currentYear);
  matchesPast12Months = this.statsService.calculateMatchesPast12Months(this.allMatches, this.currentDate);
  lowestNetScore = this.statsService.calculateLowestNetScore(this.allScores, this.allMembers);
  highestNetScore = this.statsService.calculateHighestNetScore(this.allScores, this.allMembers);
  topFrequentPlayers = this.statsService.calculateTopFrequentPlayers(this.allScores, this.allMembers, this.currentDate);

  // Top 5 winners by sum of indo, 1 ball, and 2 ball wins
  topWinners = computed(() => {
    const scoresArray = this.allScores();
    const membersArray = this.allMembers();
    // DEBUG: Log all scores and win fields
    console.log('Dashboard: allScores', scoresArray);
    if (scoresArray.length > 0) {
      console.log('Dashboard: first 5 scores win fields:', scoresArray.slice(0, 5).map(s => ({
        memberId: s.memberId,
        wonIndo: s.wonIndo,
        wonOneBall: s.wonOneBall,
        wonTwoBall: s.wonTwoBall
      })));
    }
    // Aggregate win counts per member
    const winMap: Record<string, { memberName: string; totalWins: number }> = {};
    for (const score of scoresArray) {
      let memberId: string = '';
      if (typeof score.memberId === 'object' && score.memberId !== null && '_id' in score.memberId) {
        memberId = String(score.memberId._id);
      } else {
        memberId = String(score.memberId);
      }
      const member = membersArray.find(m => String(m._id) === memberId);
      if (!member) continue;
      const wins = (score.wonIndo ? 1 : 0) + (score.wonOneBall ? 1 : 0) + (score.wonTwoBall ? 1 : 0);
      if (!winMap[memberId]) {
        winMap[memberId] = { memberName: `${member.firstName} ${member.lastName}`, totalWins: 0 };
      }
      winMap[memberId].totalWins += wins;
    }
    const sorted = Object.values(winMap)
      .sort((a, b) => b.totalWins - a.totalWins)
      .slice(0, 5);
    // DEBUG: Log computed winners
    console.log('Dashboard: topWinners', sorted);
    return sorted;
  });

  // Update the currentTheme property to use the uiConfig computed property.
  currentTheme = this.configService.uiConfig().theme;

  constructor() {
    // Add effect to debug signal changes
    effect(() => {
      console.log('Signal updates:', {
        allMembers: this.allMembers().length,
        allScores: this.allScores().length,
        allMatches: this.allMatches().length
      });
    });
  }

  ngOnInit() {
    this.auth.updateRoles();
    this.loadDashboardData();
    this.loadDbType();

  }

  private loadDbType() {
    fetch(`${environment.apiUrl}/config/db-type`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        this.dbType.set(data.dbType || 'Unknown');
        this.dbName.set(data.dbName || 'Unknown');
        this.server.set(data.server || 'Unknown');
      })
      .catch(() => {
        this.dbType.set('Unknown');
        this.dbName.set('Unknown');
        this.server.set('Unknown');
      });
  }

  ngAfterViewInit() {
    // Apply the theme after the view is initialized
    this.applyTheme();
  }

  private loadDashboardData() {
    console.log('Loading dashboard data...');
    
    this.dataService.loadDashboardData().subscribe({
      next: ({ members, scores, matches }) => {
        console.log('Dashboard data received:', {
          members: members.length,
          scores: scores.length,
          matches: matches.length
        });
        this.allMembers.set(members);
        this.totalMembers.set(members.length);
        this.allScores.set(scores);
        this.allMatches.set(matches);
        
        console.log('After setting signals:', {
          totalMembers: this.totalMembers(),
          groupsThisYear: this.groupsThisYear(),
          matchesPast12Months: this.matchesPast12Months(),
          lowestNetScore: this.lowestNetScore(),
          highestNetScore: this.highestNetScore(),
          topFrequentPlayers: this.topFrequentPlayers()
        });
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.snackBar.open('Error loading dashboard data', 'Close', { duration: 3000 });
      }
    });
  }

  private applyTheme() {
    const dashboardElement = document.querySelector('.dashboard-container');
    if (dashboardElement) {
      dashboardElement.setAttribute('data-theme', this.currentTheme);
      console.log('Theme applied:', this.currentTheme); // Debugging log
    } else {
      console.warn('Dashboard container not found'); // Debugging log
    }
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }
}
