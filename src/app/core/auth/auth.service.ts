import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import type { AuthUser } from './auth-session.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcSecurityService);

  async token(): Promise<string> {
    return firstValueFrom(this.oidc.getAccessToken());
  }

  async loadCurrentUser(endpoint = `${environment.idp.url}/me`): Promise<AuthUser | null> {
    const token = await this.token();
    if (!token) return null;

    try {
      return await firstValueFrom(this.http.get<AuthUser>(endpoint));
    } catch {
      return null;
    }
  }

  async apiFetch<T>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    return firstValueFrom(this.http.request<T>(options.method ?? 'GET', url, {
      body: options.body,
    }));
  }

  async logout(): Promise<void> {
    const isClientAdmin = window.location.pathname.startsWith('/idp-client-admin/');
    const prefix = isClientAdmin ? 'tscloak_client_admin' : 'tscloak_admin';
    const clientId = sessionStorage.getItem(`${prefix}_client_id`);
    const postLogoutRedirectUri = isClientAdmin
      ? `${window.location.origin}/idp-client-admin/${encodeURIComponent(clientId || '')}`
      : sessionStorage.getItem(`${prefix}_post_logout_redirect_uri`)
        || `${window.location.origin}/idp-admin/`;
    const idToken = await firstValueFrom(this.oidc.getIdToken());
    const params = new URLSearchParams({ post_logout_redirect_uri: postLogoutRedirectUri });

    if (clientId) params.set('client_id', clientId);
    if (idToken) params.set('id_token_hint', idToken);

    this.oidc.logoffLocal();
    window.location.href = `${environment.idp.url}/session/end?${params.toString()}`;
  }
}
