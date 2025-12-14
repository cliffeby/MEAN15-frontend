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
  public auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private statsService = inject(DashboardStatsService);
  private dataService = inject(DashboardDataService);
  private configService = inject(ConfigurationService);

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

  // Update the currentTheme property to use the uiConfig computed property
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
