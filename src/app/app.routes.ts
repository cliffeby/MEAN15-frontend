import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Dashboard } from './components/dashboard/dashboard';
import { AuthGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';
import { LoanDetail } from './components/loans/loan-detail/loan-detail';
import { LoanForm } from './components/loans/loan-form/loan-form';
import { LoanList } from './components/loans/loan-list/loan-list';
import { MainLayoutComponent } from './main-layout/main-layout';
import { ReadMe } from './read-me/read-me';
import { API } from './apis/apis';
import { OfferListComponent } from './components/offers-list/offers-list';
import { OffersForm } from './components/offers-form/offer-form';
import { OffersDashboard } from './components/offers-dashboard/offers-dashboard';
import { OfferStats } from './components/offer-stats/offer-stats';
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

export const routes: Routes = [
    // Public
    { path: '', component: Login },
    { path: 'register', component: Register },
  
    // Protected layout
    {
      path: '',
      component: MainLayoutComponent, // navbar + sidebar + footer
      canActivate: [AuthGuard],       // protects all child routes
      children: [
        { path: 'dashboard', component: Dashboard, canActivate: [roleGuard], data: { role: 'admin' } },
        { path: 'user-dashboard', component: Dashboard, canActivate: [roleGuard], data: { role: 'user' } },
        { path: 'loans', component: LoanList },
        { path: 'loans/add', component: LoanForm },
        { path: 'loans/edit/:id', component: LoanForm },
        { path: 'loans/:id', component: LoanDetail },    
        { path: 'read-me', component: ReadMe },  
        { path: 'apis', component: API },  
        { path: 'offers', component: OfferListComponent },
        { path: 'offers/create', component: OffersForm },
        { path: 'offers/dashboard', component: OffersDashboard },
        { path: 'offers/stats', component: OfferStats },
        { path: 'offers/create', component: OffersForm },
        { path: 'offers/edit/:id', component: OffersForm },
         { path: 'members', component: MemberListComponent },
         { path: 'members/add', component: MemberFormComponent },
  { path: 'members/edit/:id', component: MemberEditComponent },
  { path: 'users', component: UserListComponent, canActivate: [roleGuard], data: { role: 'admin' } },
  { path: 'scorecards', component: ScorecardListComponent },
  { path: 'scorecards/add', component: ScorecardFormComponent },
  { path: 'scorecards/edit/:id', component: ScorecardFormComponent },
  { path: 'scores', component: ScoreListComponent },
  { path: 'scores/add', component: ScoreFormComponent },
  { path: 'scores/edit/:id', component: ScoreEditComponent },
  { path: 'matches', component: MatchListComponent },
  { path: 'matches/add', component: MatchFormComponent },
  { path: 'matches/edit/:id', component: MatchEditComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
      ]
    },
  
    // Wildcard
    { path: '**', redirectTo: '' }
  ];

