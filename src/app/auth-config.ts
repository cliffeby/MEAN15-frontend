import { BrowserCacheLocation, Configuration } from '@azure/msal-browser';
import { environment } from '../environments/environment';

// MSAL.js configuration for Microsoft Entra External ID.
export const msalConfig: Configuration = {
  auth: {
    clientId: 'aa1ad4fb-4f38-46ba-970d-9af33e9a2e52',
    authority: 'https://login.microsoftonline.com/887b774a-d6ed-4d56-9c24-1af7b955fd02',
    redirectUri: environment.redirectUri,
    postLogoutRedirectUri: environment.postLogoutRedirectUri,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: false,
  },
};