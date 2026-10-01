import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import {
  provideAuth,
  StsConfigLoader,
} from 'angular-auth-oidc-client';
import { routes } from './app.routes';
import { OidcConfigLoaderFactory } from './core/auth/oidc-config.loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAuth({
      loader: {
        provide: StsConfigLoader,
        useFactory: (factory: OidcConfigLoaderFactory) => factory.create(),
        deps: [OidcConfigLoaderFactory],
      },
    }),
  ],
};
