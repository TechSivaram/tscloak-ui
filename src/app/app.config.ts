import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAuth, StsConfigLoader } from 'angular-auth-oidc-client';
import { routes } from './app.routes';
import { OidcConfigLoaderFactory } from './core/auth/oidc-config.loader';
import { loadingInterceptor } from './core/loading/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor])),
    provideAuth({
      loader: {
        provide: StsConfigLoader,
        useFactory: (factory: OidcConfigLoaderFactory) => factory.create(),
        deps: [OidcConfigLoaderFactory],
      },
    }),
  ],
};
