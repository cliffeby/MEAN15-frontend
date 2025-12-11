// MSAL.js configuration for Microsoft Entra External ID
export const msalConfig = {
  auth: {
    clientId: '<YOUR_CLIENT_ID>', // Replace with your Entra External ID app registration clientId
    authority: 'https://login.microsoftonline.com/<YOUR_TENANT_ID>', // Replace with your tenant ID
    redirectUri: 'http://localhost:4200/', // Update for production
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};
