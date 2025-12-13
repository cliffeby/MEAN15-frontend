import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig, setMsalInstance } from './app/app.config';
import { App } from './app/app';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './app/auth-config';

// Initialize MSAL before bootstrapping Angular
async function bootstrap() {
  const instance = new PublicClientApplication(msalConfig);
  await instance.initialize();
  
  // Set the initialized instance for the app to use
  setMsalInstance(instance);
  
  bootstrapApplication(App, appConfig)
    .catch((err) => console.error(err));
}

bootstrap();
