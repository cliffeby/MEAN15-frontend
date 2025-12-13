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
import { PublicClientApplication, InteractionType, IPublicClientApplication } from '@azure/msal-browser';
import { MsalModule, MsalGuard, MsalInterceptor, MsalService, MsalBroadcastService, MSAL_INSTANCE, MSAL_GUARD_CONFIG, MSAL_INTERCEPTOR_CONFIG, MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import { msalConfig } from './auth-config';

// Shared MSAL instance - will be initialized in main.ts before app bootstrap
export let msalInstance: IPublicClientApplication;

export function setMsalInstance(instance: IPublicClientApplication) {
  msalInstance = instance;
}

export function MSALInstanceFactory() {
  return msalInstance;
}

// MSAL Guard Configuration
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: ['openid', 'profile', 'email']
    },
  };
}

// MSAL Interceptor Configuration
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const apiScope = `api://aa1ad4fb-4f38-46ba-970d-9af33e9a2e52/access_as_user`;
  
  console.log('MSAL Interceptor configured with scope:', apiScope);
  
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap: new Map([
      ['http://localhost:5001/api', [apiScope]],
      // Add production URL when deploying:
      // ['https://your-production-api.com/api', [apiScope]]
    ]),
  };
}

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
      scorecards: scorecardReducer 
    }),
    provideEffects([MatchEffects, ScorecardEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: MSALGuardConfigFactory
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    }
]
};
