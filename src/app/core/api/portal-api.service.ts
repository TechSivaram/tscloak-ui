import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OidcService } from '../auth/oidc.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PortalApiService {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcService);
  private readonly baseUrl = environment.idp.url;

  async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<{ ok: boolean; status: number; data?: T }> {
    const token = await this.oidc.accessToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
    const method = options.method ?? 'GET';
    try {
      const data = await firstValueFrom(this.http.request<T>(method, `${this.baseUrl}${path}`, {
        headers,
        body: options.body,
        observe: 'body',
      }));
      return { ok: true, status: 200, data };
    } catch (error: any) {
      return { ok: false, status: error?.status ?? 0, data: error?.error };
    }
  }
}
