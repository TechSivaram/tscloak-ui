import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';
import type { AuthUser, Portal } from './auth-session.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OidcService {
  private readonly oidc = inject(OidcSecurityService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  async startLogin(): Promise<void> {
    const isClientAdmin = window.location.pathname.startsWith('/idp-client-admin/');

    if (isClientAdmin) {
      await this.startClientAdminLogin();
      return;
    }

    const result = await firstValueFrom(this.oidc.checkAuth());

    if (result.isAuthenticated) {
      return;
    }

    this.oidc.authorize();
  }

  async completeLogin(portal: Portal, progress?: (message: string) => void): Promise<void> {
    if (portal === 'idp-client-admin') {
      await this.completeClientAdminLogin(progress);
      return;
    }

    const result = await firstValueFrom(this.oidc.checkAuth());
    const authenticated = result.isAuthenticated;
    const accessToken = result.accessToken || await firstValueFrom(this.oidc.getAccessToken());

    if (!authenticated || !accessToken) {
      throw new Error('Authentication could not be completed.');
    }

    const profile = await this.fetchProfile(accessToken);
    this.requireRole(profile, 'IDP_ADMIN');
    progress?.('Redirecting to IDP Admin dashboard...');
    await this.router.navigateByUrl('/idp-admin/dashboard');
  }

  async accessToken(): Promise<string> {
    if (this.isClientAdminContext()) {
      return sessionStorage.getItem('tscloak_client_admin_access_token') || '';
    }

    return firstValueFrom(this.oidc.getAccessToken());
  }

  async currentUser(): Promise<AuthUser | null> {
    try {
      const accessToken = await this.accessToken();

      if (accessToken) {
        const profile = await firstValueFrom(this.http.get<AuthUser>(`${environment.idp.url}/api/account/profile`, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          }),
        }));

        return this.toAuthUser(profile);
      }
    } catch {
      // Fall back to the OIDC user data when the profile endpoint is unavailable.
    }

    const result = await firstValueFrom(this.oidc.getUserData());
    return result?.userData ? this.toAuthUser(result.userData) : null;
  }

  async isAuthenticated(): Promise<boolean> {
    if (this.isClientAdminContext()) {
      return !!sessionStorage.getItem('tscloak_client_admin_access_token');
    }
    return firstValueFrom(this.oidc.isAuthenticated());
  }

  private isClientAdminContext(): boolean {
    return window.location.pathname.startsWith('/idp-client-admin');
  }

  private async startClientAdminLogin(): Promise<void> {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const clientId = segments[0] === 'idp-client-admin' ? segments[1] : undefined;

    if (!clientId) {
      throw new Error('Missing clientId in the page URL.');
    }

    const config = await firstValueFrom(
      this.http.get<{
        clientId: string;
        redirectUri: string;
        postLogoutRedirectUri?: string;
        issuer?: string;
      }>(
        `${environment.idp.url}/api/admin/config/oidc?portal=idp-client-admin&clientId=${encodeURIComponent(clientId)}`,
      ),
    );

    if (!config.clientId) {
      throw new Error('OIDC client ID is missing from configuration.');
    }

    const redirectUri = config.redirectUri;
    const expectedCallback = `${window.location.origin}/idp-client-admin/callback`;
    if (redirectUri !== expectedCallback) {
      throw new Error(`Client Admin redirect URI is not configured for ${expectedCallback}.`);
    }

    const random = (length: number): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      const values = new Uint8Array(length);
      crypto.getRandomValues(values);
      return Array.from(values, (value) => chars[value % chars.length]).join('');
    };

    const codeVerifier = random(64);
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(codeVerifier),
    );
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const state = random(32);
    const nonce = random(32);

    sessionStorage.setItem('tscloak_client_admin_client_id', config.clientId);
    sessionStorage.setItem('tscloak_client_admin_redirect_uri', redirectUri);
    sessionStorage.setItem('tscloak_client_admin_state', state);
    sessionStorage.setItem('tscloak_client_admin_code_verifier', codeVerifier);
    sessionStorage.setItem('tscloak_client_admin_nonce', nonce);
    // Client Admin must return to the Angular application after logout.
    // Do not reuse a server-side/default post-logout URI that points at
    // the configured TSCloak API/IDP origin.
    const clientAdminPostLogoutRedirectUri =
      `${window.location.origin}/idp-client-admin/${encodeURIComponent(config.clientId)}`;

    sessionStorage.setItem(
      'tscloak_client_admin_post_logout_redirect_uri',
      clientAdminPostLogoutRedirectUri,
    );
    if (config.issuer) {
      sessionStorage.setItem('tscloak_client_admin_issuer', config.issuer);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email roles',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${environment.idp.url}/auth?${params.toString()}`;
  }

  private async completeClientAdminLogin(progress?: (message: string) => void): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      throw new Error(params.get('error_description') || `Authentication failed: ${error}`);
    }

    const code = params.get('code');
    const state = params.get('state');
    const expectedState = sessionStorage.getItem('tscloak_client_admin_state');
    const codeVerifier = sessionStorage.getItem('tscloak_client_admin_code_verifier');
    const nonce = sessionStorage.getItem('tscloak_client_admin_nonce');
    const clientId = sessionStorage.getItem('tscloak_client_admin_client_id');
    const redirectUri = sessionStorage.getItem('tscloak_client_admin_redirect_uri');

    if (!code) throw new Error('Authorization code was not returned.');
    if (!state || !expectedState || state !== expectedState) throw new Error('Invalid client admin callback state.');
    if (!clientId) throw new Error('Client Admin OIDC configuration is missing.');
    if (!codeVerifier) throw new Error('Client Admin PKCE verifier is missing.');
    if (!nonce) throw new Error('Client Admin OIDC nonce is missing.');
    if (!redirectUri) throw new Error('Client Admin redirect URI is missing.');

    progress?.('Exchanging authorization code...');

    const tokenResponse = await firstValueFrom(
      this.http.post<{
        access_token?: string;
        id_token?: string;
        refresh_token?: string;
        token_type?: string;
        expires_in?: number;
      }>(
        `${environment.idp.url}/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }).toString(),
        { headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }) },
      ),
    );

    if (!tokenResponse?.access_token) {
      throw new Error('Access token was not returned.');
    }

    if (!tokenResponse.id_token) {
      throw new Error('ID token was not returned.');
    }

    if (tokenResponse.token_type && tokenResponse.token_type.toLowerCase() !== 'bearer') {
      throw new Error('Unsupported OIDC token type.');
    }

    if (tokenResponse.expires_in !== undefined &&
        (!Number.isFinite(tokenResponse.expires_in) || tokenResponse.expires_in <= 0)) {
      throw new Error('Invalid access token lifetime.');
    }

    const issuer = sessionStorage.getItem('tscloak_client_admin_issuer') || environment.idp.url;

    progress?.('Validating ID token...');
    await this.validateClientAdminIdToken({
      token: tokenResponse.id_token,
      issuer,
      clientId,
      nonce,
      accessToken: tokenResponse.access_token,
    });

    progress?.('Loading user profile...');
    const profile = await this.fetchProfile(tokenResponse.access_token);

    progress?.('Checking Client Admin role...');
    this.requireRole(profile, 'IDP_CLIENT_ADMIN');

    sessionStorage.setItem('tscloak_client_admin_access_token', tokenResponse.access_token);
    sessionStorage.setItem('tscloak_client_admin_id_token', tokenResponse.id_token);
    if (tokenResponse.refresh_token) {
      sessionStorage.setItem('tscloak_client_admin_refresh_token', tokenResponse.refresh_token);
    }

    sessionStorage.removeItem('tscloak_client_admin_state');
    sessionStorage.removeItem('tscloak_client_admin_code_verifier');
    sessionStorage.removeItem('tscloak_client_admin_nonce');

    progress?.('Redirecting to Client Admin dashboard...');
    const navigated = await this.router.navigateByUrl('/idp-client-admin/dashboard');

    // The Angular router should handle this transition. If a navigation is
    // cancelled by a browser/router edge case, perform a normal browser
    // navigation so the dashboard is still reached.
    if (!navigated && window.location.pathname !== '/idp-client-admin/dashboard') {
      window.location.assign('/idp-client-admin/dashboard');
    }
  }

  private async fetchProfile(accessToken: string): Promise<AuthUser> {
    return this.toAuthUser(await firstValueFrom(this.http.get<AuthUser>(`${environment.idp.url}/me`, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      }),
    })));
  }

  private requireRole(user: AuthUser, role: string): void {
    if (!user.roles.includes(role)) {
      throw new Error(`Access denied: ${role} role is required for this portal.`);
    }
  }

  private async validateClientAdminIdToken(input: {
    token: string;
    issuer: string;
    clientId: string;
    nonce: string;
    accessToken: string;
  }): Promise<void> {
    const parts = input.token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token format.');
    }

    const header = this.decodeJwtPart(parts[0], 'ID token header');
    const payload = this.decodeJwtPart(parts[1], 'ID token payload');

    if (header['alg'] !== 'RS256') {
      throw new Error('Unsupported ID token signing algorithm.');
    }

    if (header['typ'] !== undefined && header['typ'] !== 'JWT') {
      throw new Error('Invalid ID token type.');
    }

    if (typeof header['kid'] !== 'string' || !header['kid']) {
      throw new Error('ID token signing key identifier is missing.');
    }

    if (payload['iss'] !== input.issuer) {
      throw new Error('OIDC issuer mismatch.');
    }

    if (typeof payload['sub'] !== 'string' || !payload['sub']) {
      throw new Error('OIDC subject is missing or invalid.');
    }

    if (payload['nonce'] !== input.nonce) {
      throw new Error('OIDC nonce mismatch.');
    }

    const audience = payload['aud'];
    if (typeof audience === 'string') {
      if (audience !== input.clientId) {
        throw new Error('OIDC audience mismatch.');
      }
    } else if (Array.isArray(audience) && audience.every((value) => typeof value === 'string')) {
      if (!audience.includes(input.clientId)) {
        throw new Error('OIDC audience mismatch.');
      }
      if (payload['azp'] !== input.clientId) {
        throw new Error('OIDC authorized-party mismatch.');
      }
    } else {
      throw new Error('OIDC audience is missing or invalid.');
    }

    const now = Math.floor(Date.now() / 1000);
    const clockSkew = 60;
    this.requireNumericClaim(payload, 'exp');
    if ((payload['exp'] as number) + clockSkew < now) {
      throw new Error('ID token has expired.');
    }

    this.requireNumericClaim(payload, 'iat');
    if ((payload['iat'] as number) - clockSkew > now) {
      throw new Error('ID token issued-at time is in the future.');
    }

    if (payload['nbf'] !== undefined) {
      this.requireNumericClaim(payload, 'nbf');
      if ((payload['nbf'] as number) - clockSkew > now) {
        throw new Error('ID token is not valid yet.');
      }
    }

    const discovery = await firstValueFrom(
      this.http.get<{ issuer?: string; jwks_uri?: string }>(
        `${input.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`,
      ),
    );

    if (discovery.issuer !== input.issuer) {
      throw new Error('OIDC discovery issuer mismatch.');
    }

    const jwksUri = discovery.jwks_uri;
    if (!jwksUri) {
      throw new Error('OIDC discovery does not provide jwks_uri.');
    }

    const jwks = await firstValueFrom(
      this.http.get<{ keys?: Array<JsonWebKey & { kid?: string; alg?: string; use?: string }> }>(jwksUri),
    );

    const key = jwks.keys?.find((candidate) =>
      candidate.kid === header['kid'] &&
      (!candidate.alg || candidate.alg === 'RS256') &&
      (!candidate.use || candidate.use === 'sig'),
    );

    if (!key) {
      throw new Error('No matching OIDC signing key was found.');
    }

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const signature = this.decodeBase64Url(parts[2]);
    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

    // Web Crypto's TypeScript definitions require an ArrayBuffer-backed
    // BufferSource. Uint8Array can be backed by ArrayBufferLike in newer
    // TypeScript versions, so copy both values into concrete ArrayBuffers.
    const signatureBuffer = new ArrayBuffer(signature.byteLength);
    new Uint8Array(signatureBuffer).set(signature);

    const signingInputBuffer = new ArrayBuffer(signingInput.byteLength);
    new Uint8Array(signingInputBuffer).set(signingInput);

    const validSignature = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBuffer,
      signingInputBuffer,
    );

    if (!validSignature) {
      throw new Error('ID token signature validation failed.');
    }

    if (payload['at_hash'] !== undefined) {
      if (typeof payload['at_hash'] !== 'string') {
        throw new Error('Invalid ID token at_hash claim.');
      }
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.accessToken)));
      const half = digest.slice(0, digest.length / 2);
      const expectedAtHash = this.base64UrlEncode(half);
      if (payload['at_hash'] !== expectedAtHash) {
        throw new Error('OIDC access-token hash mismatch.');
      }
    }
  }

  private requireNumericClaim(payload: Record<string, unknown>, claim: string): void {
    if (typeof payload[claim] !== 'number' || !Number.isFinite(payload[claim])) {
      throw new Error(`ID token ${claim} claim is missing or invalid.`);
    }
  }

  private decodeJwtPart(value: string, label: string): Record<string, unknown> {
    try {
      const decoded = new TextDecoder().decode(this.decodeBase64Url(value));
      const parsed: unknown = JSON.parse(decoded);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error();
      }
      return parsed as Record<string, unknown>;
    } catch {
      throw new Error(`Invalid ${label}.`);
    }
  }

  private decodeBase64Url(value: string): Uint8Array {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(normalized + padding);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  private base64UrlEncode(value: Uint8Array): string {
    let binary = '';
    for (const byte of value) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async logout(): Promise<void> {
    if (this.isClientAdminContext()) {
      const clientId = sessionStorage.getItem('tscloak_client_admin_client_id');
      const postLogoutRedirectUri = sessionStorage.getItem('tscloak_client_admin_post_logout_redirect_uri')
        || `${window.location.origin}/idp-client-admin/${encodeURIComponent(clientId || '')}`;
      const idToken = sessionStorage.getItem('tscloak_client_admin_id_token');
      const params = new URLSearchParams({ post_logout_redirect_uri: postLogoutRedirectUri });
      if (clientId) params.set('client_id', clientId);
      if (idToken) params.set('id_token_hint', idToken);

      [
        'tscloak_client_admin_access_token',
        'tscloak_client_admin_id_token',
        'tscloak_client_admin_refresh_token',
        'tscloak_client_admin_redirect_uri',
        'tscloak_client_admin_post_logout_redirect_uri',
        'tscloak_client_admin_issuer',
        'tscloak_client_admin_state',
        'tscloak_client_admin_code_verifier',
        'tscloak_client_admin_nonce',
      ].forEach((key) => sessionStorage.removeItem(key));

      window.location.href = `${environment.idp.url}/session/end?${params.toString()}`;
      return;
    }

    const clientId = sessionStorage.getItem('tscloak_admin_client_id');
    const postLogoutRedirectUri = sessionStorage.getItem('tscloak_admin_post_logout_redirect_uri')
      || `${window.location.origin}/idp-admin/`;
    const idToken = await firstValueFrom(this.oidc.getIdToken());
    const params = new URLSearchParams({ post_logout_redirect_uri: postLogoutRedirectUri });
    if (clientId) params.set('client_id', clientId);
    if (idToken) params.set('id_token_hint', idToken);
    this.oidc.logoffLocal();
    window.location.href = `${environment.idp.url}/session/end?${params.toString()}`;
  }

  private toAuthUser(value: unknown): AuthUser {
    if (!value || typeof value !== 'object') {
      return { roles: [] };
    }

    const claims = value as Record<string, unknown>;
    const roles = Array.isArray(claims['roles'])
      ? claims['roles'].filter((role): role is string => typeof role === 'string')
      : [];

    return {
      ...claims,
      id: typeof claims['sub'] === 'string' ? claims['sub'] : undefined,
      username: typeof claims['preferred_username'] === 'string'
        ? claims['preferred_username']
        : typeof claims['username'] === 'string'
          ? claims['username']
          : undefined,
      displayName: typeof claims['name'] === 'string' ? claims['name'] : undefined,
      email: typeof claims['email'] === 'string' ? claims['email'] : undefined,
      roles,
    };
  }
}
