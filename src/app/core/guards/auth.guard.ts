import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { OidcService } from '../auth/oidc.service';
import { firstValueFrom } from 'rxjs';

export const authGuard = (portal: 'idp-admin' | 'idp-client-admin'): CanActivateFn => async () => {
  const oidc = inject(OidcSecurityService);
  const router = inject(Router);
  if (portal === 'idp-client-admin') {
    const accessToken = sessionStorage.getItem('tscloak_client_admin_access_token');

    if (accessToken) {
      const authService = inject(OidcService);
      const user = await authService.currentUser();
      if (user?.roles.includes('IDP_CLIENT_ADMIN')) {
        return true;
      }
    }

    const clientId = sessionStorage.getItem('tscloak_client_admin_client_id');
    return clientId
      ? router.createUrlTree(['/idp-client-admin', clientId])
      : router.createUrlTree(['/']);
  }

  const result = await firstValueFrom(oidc.checkAuth());
  const authenticated = result.isAuthenticated;

  if (authenticated) {
    return true;
  }

  return router.createUrlTree(['/idp-admin']);
};
