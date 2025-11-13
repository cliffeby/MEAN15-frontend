import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../services/authService';
import { Member } from '../../models/member';
import { Score } from '../../models/score';
import { Match } from '../../models/match';
import { DashboardStatsService } from './dashboard-stats.service';
import { DashboardDataService } from './dashboard-data.service';
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
    MatIconModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit {
  private router = inject(Router);
  public auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private statsService = inject(DashboardStatsService);
  private dataService = inject(DashboardDataService);

  // Data signals
  totalMembers = signal(0);
  allMembers = signal<Member[]>([]);
  allScores = signal<Score[]>([]);
  allMatches = signal<Match[]>([]);

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
    
    this.dataService.loadDashboardData().subscribe({
      next: ({ members, scores, matches }) => {
        this.allMembers.set(members);
        this.totalMembers.set(members.length);
        this.allScores.set(scores);
        this.allMatches.set(matches);
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
