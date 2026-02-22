import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { matchReducer } from './store/reducers/match.reducer';
import { MatchEffects } from './store/effects/match.effects';
import { scorecardReducer } from './store/reducers/scorecard.reducer';
import { ScorecardEffects } from './store/effects/scorecard.effects';
import { LocalAuthInterceptor } from './interceptors/local-auth.interceptor';
import { AuthExpiryInterceptor } from './interceptors/auth-expiry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(BrowserAnimationsModule),
    importProvidersFrom(MatDialogModule),
    provideHttpClient(withInterceptorsFromDi()),
    provideStore({
      matches: matchReducer,
      scorecards: scorecardReducer,
    }),
    provideEffects([MatchEffects, ScorecardEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    { provide: HTTP_INTERCEPTORS, useClass: LocalAuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthExpiryInterceptor, multi: true },
  ],
};
