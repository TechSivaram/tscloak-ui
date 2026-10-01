import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  OpenIdConfiguration,
  StsConfigHttpLoader,
} from 'angular-auth-oidc-client';
import { environment } from '../../../environments/environment';

const TSCLOAK_API = environment.idp.url;
const IDP_ADMIN_CLIENT_ID = '04d26513a9de6faa2dff7aaa4ba05582d16ed23ff8b03363';

interface TSCloakOidcConfig {
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
  issuer?: string;
}

@Injectable({ providedIn: 'root' })
export class OidcConfigLoaderFactory {
  constructor(private readonly http: HttpClient) {}

  create(): StsConfigHttpLoader {
    const { portal, clientId } = this.getPortalContext();

    if (!clientId) {
      throw new Error('Client ID is required for client administration.');
    }

    const config$: Observable<OpenIdConfiguration> = this.http
      .get<TSCloakOidcConfig>(
        `${TSCLOAK_API}/api/admin/config/oidc?portal=${encodeURIComponent(portal)}&clientId=${encodeURIComponent(clientId)}`,
      )
      .pipe(
        map((config) => {
          if (!config.clientId) {
            throw new Error('OIDC client ID is missing from configuration.');
          }
          if (!config.redirectUri) {
            throw new Error('OIDC redirect URI is missing from configuration.');
          }

          const storagePrefix = portal === 'idp-admin'
            ? 'tscloak_admin'
            : 'tscloak_client_admin';

          sessionStorage.setItem(`${storagePrefix}_client_id`, config.clientId);
          sessionStorage.setItem(`${storagePrefix}_redirect_uri`, config.redirectUri);

          if (config.postLogoutRedirectUri) {
            sessionStorage.setItem(
              `${storagePrefix}_post_logout_redirect_uri`,
              config.postLogoutRedirectUri,
            );
          }

          const oidcConfig: OpenIdConfiguration = {
            authority: config.issuer || TSCLOAK_API,
            clientId: config.clientId,
            redirectUrl: config.redirectUri,
            postLogoutRedirectUri: config.postLogoutRedirectUri,
            responseType: 'code',
            scope: portal === 'idp-admin'
              ? 'openid profile email offline_access roles'
              : 'openid profile email roles',
            silentRenew: portal === 'idp-admin',
            useRefreshToken: portal === 'idp-admin',
            secureRoutes: [
              `${TSCLOAK_API}/api/`,
              `${TSCLOAK_API}/me`,
            ],
            autoUserInfo: false,
          };

          if (portal === 'idp-admin') {
            oidcConfig.customParamsAuthRequest = { prompt: 'consent' };
          }

          return oidcConfig;
        }),
      );

    return new StsConfigHttpLoader(config$);
  }

  private getPortalContext(): { portal: 'idp-admin' | 'idp-client-admin'; clientId: string } {
    const segments = window.location.pathname.split('/').filter(Boolean);

    if (segments[0] === 'idp-admin') {
      return { portal: 'idp-admin', clientId: IDP_ADMIN_CLIENT_ID };
    }

    if (segments[0] === 'idp-client-admin') {
      // The clientId exists only on the login entry route:
      // /idp-client-admin/:clientId. The OIDC callback is
      // /idp-client-admin/callback.html and must never be interpreted
      // as a clientId. During the callback, recover the original clientId
      // from the authentication session established before redirecting
      // to the IdP.
      const storedClientId = sessionStorage.getItem('tscloak_client_admin_client_id');
      const isCallback = segments[1] === 'callback.html';
      const clientId = isCallback ? storedClientId || '' : storedClientId || segments[1] || '';

      if (clientId) {
        return { portal: 'idp-client-admin', clientId };
      }
    }

    throw new Error('OIDC configuration is only available inside an authenticated TSCloak portal.');
  }
}
