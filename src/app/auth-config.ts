import { BrowserCacheLocation, Configuration } from '@azure/msal-browser';

// MSAL.js configuration for Microsoft Entra External ID
export const msalConfig: Configuration = {
  auth: {
    clientId: 'aa1ad4fb-4f38-46ba-970d-9af33e9a2e52', // Replace with your Entra External ID app registration clientId
    authority: 'https://login.microsoftonline.com/887b774a-d6ed-4d56-9c24-1af7b955fd02', // Replace with your tenant ID
    redirectUri: 'https://brave-tree-00ac3970f.1.azurestaticapps.net/',
    postLogoutRedirectUri: 'https://brave-tree-00ac3970f.1.azurestaticapps.net/login',
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: false,
  },
};
