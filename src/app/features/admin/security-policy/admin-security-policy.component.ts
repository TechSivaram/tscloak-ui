import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PortalApiService } from '../../../core/api/portal-api.service';
@Component({
  selector: 'app-admin-security-policy',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-security-policy.component.html',
  styleUrl: './admin-security-policy.component.scss',
})
export class AdminSecurityPolicyComponent {
  private readonly api = inject(PortalApiService);
  readonly message = signal('');
  readonly saving = signal(false);
  readonly fields = signal<Record<string, number>>({});
  readonly names = [
    ['accessTokenTtl', 'Access token TTL (seconds)'],
    ['idTokenTtl', 'ID token TTL (seconds)'],
    ['authorizationCodeTtl', 'Authorization code TTL (seconds)'],
    ['refreshTokenTtl', 'Refresh token TTL (seconds)'],
    ['sessionTtl', 'Session TTL (seconds)'],
    ['interactionTtl', 'Interaction TTL (seconds)'],
  ];
  constructor() {
    void this.load();
  }
  async load() {
    const r = await this.api.request<Record<string, number>>('/api/admin/security-policy');
    if (r.ok && r.data) this.fields.set({ ...r.data });
  }
  set(k: string, v: string) {
    this.fields.update((x) => ({ ...x, [k]: v === '' ? 0 : Number(v) }));
  }
  async save() {
    this.saving.set(true);
    const r = await this.api.request('/api/admin/security-policy', {
      method: 'PUT',
      body: this.fields(),
    });
    this.saving.set(false);
    this.message.set(r.ok ? 'Security policy saved.' : `Unable to save policy (${r.status})`);
  }
}
