import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHttpClient } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { offerReducer } from './store/reducers/offer.reducer';
import { OffersEffects } from './store/effects/offer.effects';
import { matchReducer } from './store/reducers/match.reducer';
import { MatchEffects } from './store/effects/match.effects';
import { scorecardReducer } from './store/reducers/scorecard.reducer';
import { ScorecardEffects } from './store/effects/scorecard.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(BrowserAnimationsModule),
    importProvidersFrom(MatDialogModule),
    provideHttpClient(),
    provideStore({ 
      offers: offerReducer,
      matches: matchReducer,
      scorecards: scorecardReducer 
    }),
    provideEffects([OffersEffects, MatchEffects, ScorecardEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
]
};
