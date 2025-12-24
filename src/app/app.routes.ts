import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Dashboard } from './components/dashboard/dashboard';
import { AuthGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';
import { MsalGuard } from '@azure/msal-angular';
import { MainLayoutComponent } from './main-layout/main-layout';
import { ReadMe } from './read-me/read-me';
import { API } from './apis/apis';
import { MemberFormComponent } from './components/member-form/member-form';
import { MemberEditComponent } from './components/member-edit/member-edit';
import { MemberListComponent } from './components/member-list/member-list';
import { UserListComponent } from './components/user-list/user-list';
import { ScorecardListComponent } from './components/scorecard-list/scorecard-list';
import { ScorecardFormComponent } from './components/scorecard-form/scorecard-form';
import { ScoreListComponent } from './components/score-list/score-list';
import { ScoreFormComponent } from './components/score-form/score-form';
import { ScoreEditComponent } from './components/score-edit/score-edit';
import { MatchListComponent } from './components/match-list/match-list';
import { MatchFormComponent } from './components/match-form/match-form';
import { MatchEditComponent } from './components/match-edit/match-edit';
import { ScoreEntryComponent } from './components/score-entry/score-entry';
import { SimpleScoreEntryComponent } from './components/simple-score-entry/simple-score-entry';
import { PrintableScorecardComponent } from './components/printable-scorecard/printable-scorecard';
import { AdminConfigurationComponent } from './components/admin-configuration/admin-configuration.component';
import { OrphanManagementComponent } from './components/orphan-management/orphan-management';
import { HcapListComponent } from './components/hcap-list/hcap-list';
import { AuditReportComponent } from './components/audit-report/audit-report.component';

export const routes: Routes = [
  // Public
  { path: '', component: Login },
  { path: 'register', component: Register },

  // Protected layout - using MsalGuard for Entra authentication
  {
    path: '',
    component: MainLayoutComponent, // navbar + sidebar + footer
    canActivate: [MsalGuard], // MSAL guard protects all child routes
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [roleGuard],
        data: { role: ['admin', 'developer','fieldhand', 'user'] }, // 'developer' added here
      },
      {
        path: 'user-dashboard',
        component: Dashboard,
        canActivate: [roleGuard],
        data: { role: 'user' },
      },
      { path: 'read-me', 
        component: ReadMe,
        canActivate: [roleGuard],
        data: { role: 'developer' }
       },
      { path: 'apis', component: API },
      { path: 'members', component: MemberListComponent },
      {
        path: 'members/add',
        component: MemberFormComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      {
        path: 'members/edit/:id',
        component: MemberEditComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      {
        path: 'users',
        component: UserListComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      { path: 'scorecards', component: ScorecardListComponent },
      {
        path: 'scorecards/add',
        component: ScorecardFormComponent,
        canActivate: [roleGuard],
        data: { role: ['admin', 'developer','fieldhand'] },
      },
      {
        path: 'scorecards/edit/:id',
        component: ScorecardFormComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      { path: 'scores', component: ScoreListComponent },
      { path: 'scores/add', component: ScoreFormComponent },
      { path: 'scores/edit/:id', component: ScoreEditComponent },
      { path: 'hcaps', 
        component: HcapListComponent,
        canActivate: [roleGuard],
        data: { role: ['admin', 'developer','fieldhand'] }
        },
      { path: 'matches', component: MatchListComponent },
      {
        path: 'matches/add',
        component: MatchFormComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      {
        path: 'matches/edit/:id',
        component: MatchEditComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      {
        path: 'matches/:id/score-entry',
        component: ScoreEntryComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      {
        path: 'matches/:id/simple-score-entry',
        component: SimpleScoreEntryComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      {
        path: 'matches/:id/scoreentry',
        component: ScoreEntryComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      { path: 'matches/:id/printable-scorecard', component: PrintableScorecardComponent },
      {
        path: 'admin/configuration',
        component: AdminConfigurationComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      {
        path: 'admin/orphans',
        component: OrphanManagementComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      {
        path: 'admin/audit-report',
        component: AuditReportComponent,
        canActivate: [roleGuard],
        data: { role: 'admin' },
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Wildcard
  { path: '**', redirectTo: '' },
];
