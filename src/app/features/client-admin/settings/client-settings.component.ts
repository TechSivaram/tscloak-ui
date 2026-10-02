import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PortalApiService } from '../../../core/api/portal-api.service';
@Component({
  selector: 'app-client-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './client-settings.component.html',
  styleUrl: './client-settings.component.scss',
})
export class ClientSettingsComponent {
  private readonly api = inject(PortalApiService);
  readonly settings = signal<any>(null);
  readonly message = signal('');
  form: any = {};
  constructor() {
    void this.load();
  }
  async load() {
    const r = await this.api.request<any>('/api/client-admin/settings');
    if (!r.ok) {
      this.message.set('Unable to load client settings.');
      return;
    }
    const c = r.data;
    this.settings.set(c);
    this.form = {
      name: c.name,
      redirectUris: (c.redirectUris || []).join('\n'),
      postLogoutRedirectUris: (c.postLogoutRedirectUris || []).join('\n'),
      allowedScopes: (c.allowedScopes || []).join(' '),
      grantTypes: (c.grantTypes || []).join(' '),
      responseTypes: (c.responseTypes || []).join(' '),
      jwksUri: c.jwksUri || '',
      tokenEndpointAuthMethods: c.tokenEndpointAuthMethods || ['none'],
      interactionMode: c.interactionMode || 'hosted',
      interactionLoginUrl: c.interactionLoginUrl || '',
      interactionConsentUrl: c.interactionConsentUrl || '',
    };
  }
  list(v: string) {
    return String(v || '')
      .split(/\r?\n|,|\s+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  toggle(v: string) {
    const a = this.form.tokenEndpointAuthMethods as string[];
    this.form.tokenEndpointAuthMethods = a.includes(v) ? a.filter((x) => x !== v) : [...a, v];
  }
  async save() {
    const r = await this.api.request('/api/client-admin/settings', {
      method: 'PUT',
      body: {
        name: this.form.name,
        redirectUris: this.list(this.form.redirectUris),
        postLogoutRedirectUris: this.list(this.form.postLogoutRedirectUris),
        allowedScopes: this.list(this.form.allowedScopes),
        grantTypes: this.list(this.form.grantTypes),
        responseTypes: this.list(this.form.responseTypes),
        tokenEndpointAuthMethods: this.form.tokenEndpointAuthMethods,
        jwksUri: this.form.jwksUri || undefined,
        interactionMode: this.form.interactionMode,
        interactionLoginUrl: this.form.interactionLoginUrl || undefined,
        interactionConsentUrl: this.form.interactionConsentUrl || undefined,
      },
    });
    this.message.set(r.ok ? 'Client settings saved.' : 'Unable to save client settings.');
    if (r.ok) await this.load();
  }
}
