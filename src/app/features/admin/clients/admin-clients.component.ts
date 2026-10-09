import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';
import { OidcService } from '../../../core/auth/oidc.service';
import { environment } from '../../../../environments/environment';

const API = environment.idp.url;

export interface AdminClient {
  clientId: string;
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
  allowedScopes: string[];
  grantTypes: string[];
  responseTypes: string[];
  tokenEndpointAuthMethods?: string[];
  jwksUri?: string;
  interactionMode: 'hosted' | 'external';
  interactionLoginUrl?: string;
  interactionConsentUrl?: string;
  enabled: boolean;
}

const clientPayloadSchema = z.object({
  name: z.string().trim().min(2),
  redirectUris: z.array(z.string().trim().min(1)).min(1),
  postLogoutRedirectUris: z.array(z.string().trim().min(1)).default([]),
  allowedScopes: z.array(z.string().trim().min(1)).min(1),
  grantTypes: z.array(z.string().trim().min(1)).min(1),
  responseTypes: z.array(z.string().trim().min(1)).min(1),
  tokenEndpointAuthMethods: z.array(z.string().trim().min(1)).min(1),
  jwksUri: z.string().trim().url().optional(),
  interactionMode: z.enum(['hosted', 'external']),
  interactionLoginUrl: z.string().trim().url().optional(),
  interactionConsentUrl: z.string().trim().url().optional(),
  enabled: z.boolean(),
});

type ClientPayload = z.infer<typeof clientPayloadSchema>;

@Component({
  selector: 'app-admin-clients',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-clients.component.html',
  styleUrl: './admin-clients.component.scss',
})
export class AdminClientsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcService);
  private readonly fb = inject(FormBuilder);

  readonly clients = signal<AdminClient[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formVisible = signal(false);
  readonly editingClientId = signal<string | null>(null);
  readonly message = signal('');
  readonly error = signal(false);
  readonly deleteTarget = signal<AdminClient | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    tokenEndpointAuthMethods: this.fb.nonNullable.control<string[]>(['none']),
    jwksUri: [''],
    redirectUris: ['', Validators.required],
    postLogoutRedirectUris: [''],
    allowedScopeOptions: this.fb.nonNullable.control<string[]>(['openid', 'profile', 'email']),
    additionalScopes: [''],
    grantTypeOptions: this.fb.nonNullable.control<string[]>(['authorization_code', 'refresh_token']),
    additionalGrantTypes: [''],
    responseTypes: ['code', Validators.required],
    interactionMode: this.fb.nonNullable.control<'hosted' | 'external'>('hosted'),
    interactionLoginUrl: [''],
    interactionConsentUrl: [''],
    enabled: this.fb.nonNullable.control('true'),
  });

  readonly standardScopes = [
    { value: 'openid', label: 'OpenID' },
    { value: 'profile', label: 'Profile' },
    { value: 'email', label: 'Email' },
    { value: 'offline_access', label: 'Offline access' },
    { value: 'roles', label: 'Roles' },
    { value: 'scim', label: 'SCIM provisioning' },
  ];
  readonly standardGrantTypes = [
    { value: 'authorization_code', label: 'Authorization Code' },
    { value: 'refresh_token', label: 'Refresh Token' },
    { value: 'client_credentials', label: 'Client Credentials' },
  ];
  private readonly standardScopeValues = new Set(this.standardScopes.map((item) => item.value));
  private readonly standardGrantTypeValues = new Set(this.standardGrantTypes.map((item) => item.value));

  readonly authMethods = [
    { value: 'none', label: 'None (public client)' },
    { value: 'client_secret_basic', label: 'Client secret basic' },
    { value: 'client_secret_post', label: 'Client secret post' },
    { value: 'client_secret_jwt', label: 'Client secret JWT' },
    { value: 'private_key_jwt', label: 'Private key JWT' },
  ];

  ngOnInit(): void {
    void this.loadClients();
  }

  async loadClients(): Promise<void> {
    this.loading.set(true);
    this.clearMessage();

    try {
      const clients = await firstValueFrom(
        this.http.get<AdminClient[]>(`${API}/api/admin/clients`, {
          headers: await this.authHeaders(),
        }),
      );
      this.clients.set(clients ?? []);
    } catch (error) {
      console.error('Unable to load clients:', error);
      this.clients.set([]);
      this.showMessage('Unable to load clients.', true);
    } finally {
      this.loading.set(false);
    }
  }

  toggleForm(): void {
    this.clearMessage();

    if (this.formVisible()) {
      this.formVisible.set(false);
      return;
    }

    this.resetForCreate();
    this.formVisible.set(true);
  }

  editClient(client: AdminClient): void {
    this.clearMessage();
    this.editingClientId.set(client.clientId);
    this.formVisible.set(true);

    this.form.setValue({
      name: client.name ?? '',
      tokenEndpointAuthMethods: client.tokenEndpointAuthMethods?.length
        ? [...client.tokenEndpointAuthMethods]
        : ['none'],
      jwksUri: client.jwksUri ?? '',
      redirectUris: (client.redirectUris ?? []).join('\n'),
      postLogoutRedirectUris: (client.postLogoutRedirectUris ?? []).join('\n'),
      allowedScopeOptions: (client.allowedScopes ?? []).filter((value) => this.standardScopeValues.has(value)),
      additionalScopes: (client.allowedScopes ?? []).filter((value) => !this.standardScopeValues.has(value)).join(' '),
      grantTypeOptions: (client.grantTypes ?? []).filter((value) => this.standardGrantTypeValues.has(value)),
      additionalGrantTypes: (client.grantTypes ?? []).filter((value) => !this.standardGrantTypeValues.has(value)).join(' '),
      responseTypes: (client.responseTypes ?? []).join(' '),
      interactionMode: client.interactionMode ?? 'hosted',
      interactionLoginUrl: client.interactionLoginUrl ?? '',
      interactionConsentUrl: client.interactionConsentUrl ?? '',
      enabled: String(client.enabled),
    });

    setTimeout(() => {
      document.getElementById('clientFormPanel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  cancelForm(): void {
    this.formVisible.set(false);
    this.resetForCreate();
    this.clearMessage();
  }

  requestDeleteClient(client: AdminClient): void {
    this.deleteTarget.set(client);
  }

  cancelDeleteClient(): void {
    this.deleteTarget.set(null);
  }

  async confirmDeleteClient(): Promise<void> {
    const client = this.deleteTarget();
    if (!client) return;
    this.deleteTarget.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${API}/api/admin/clients/${encodeURIComponent(client.clientId)}`, {
          headers: await this.authHeaders(),
        }),
      );

      await this.loadClients();
    } catch (error) {
      console.error('Unable to delete client:', error);
      this.showMessage('Unable to delete client.', true);
    }
  }

  async submit(): Promise<void> {
    this.clearMessage();
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.showMessage('Please complete the required fields.', true);
      return;
    }

    const raw = this.form.getRawValue();
    const payload: ClientPayload = {
      name: raw.name.trim(),
      redirectUris: this.toList(raw.redirectUris),
      postLogoutRedirectUris: this.toList(raw.postLogoutRedirectUris),
      allowedScopes: [...new Set([
        ...raw.allowedScopeOptions,
        ...this.toWords(raw.additionalScopes),
      ])],
      grantTypes: [...new Set([
        ...raw.grantTypeOptions,
        ...this.toWords(raw.additionalGrantTypes),
      ])],
      responseTypes: this.toWords(raw.responseTypes),
      tokenEndpointAuthMethods: [...raw.tokenEndpointAuthMethods],
      jwksUri: raw.jwksUri.trim() || undefined,
      interactionMode: raw.interactionMode,
      interactionLoginUrl: raw.interactionLoginUrl.trim() || undefined,
      interactionConsentUrl: raw.interactionConsentUrl.trim() || undefined,
      enabled: raw.enabled === 'true',
    };

    const parsed = clientPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.showMessage(parsed.error.issues[0]?.message ?? 'Invalid client configuration.', true);
      return;
    }

    this.saving.set(true);

    try {
      const editingId = this.editingClientId();
      const url = editingId
        ? `${API}/api/admin/clients/${encodeURIComponent(editingId)}`
        : `${API}/api/admin/clients`;

      await firstValueFrom(
        this.http.request(editingId ? 'PUT' : 'POST', url, {
          body: parsed.data,
          headers: await this.authHeaders(),
        }),
      );

      this.formVisible.set(false);
      this.resetForCreate();
      await this.loadClients();
    } catch (error) {
      console.error('Unable to save client:', error);
      this.showMessage(
        this.editingClientId() ? 'Unable to update client.' : 'Unable to create client.',
        true,
      );
    } finally {
      this.saving.set(false);
    }
  }

  isAuthMethodSelected(method: string): boolean {
    return this.form.controls.tokenEndpointAuthMethods.value.includes(method);
  }

  toggleAuthMethod(method: string): void {
    const current = this.form.controls.tokenEndpointAuthMethods.value;
    const next = current.includes(method)
      ? current.filter((value) => value !== method)
      : [...current, method];

    this.form.controls.tokenEndpointAuthMethods.setValue(next);
  }

  isOptionSelected(group: 'allowedScopeOptions' | 'grantTypeOptions', value: string): boolean {
    return this.form.controls[group].value.includes(value);
  }

  toggleOption(group: 'allowedScopeOptions' | 'grantTypeOptions', value: string): void {
    const control = this.form.controls[group];
    const current: string[] = control.value;
    control.setValue(current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
    control.markAsDirty();
    control.markAsTouched();
  }

  showExternalInteractionFields(): boolean {
    return this.form.controls.interactionMode.value === 'external';
  }

  trackByClientId(_: number, client: AdminClient): string {
    return client.clientId;
  }

  private async authHeaders(): Promise<HttpHeaders> {
    const token = await this.oidc.accessToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  }

  private resetForCreate(): void {
    this.editingClientId.set(null);
    this.form.reset({
      name: '',
      tokenEndpointAuthMethods: ['none'],
      jwksUri: '',
      redirectUris: '',
      postLogoutRedirectUris: '',
      allowedScopeOptions: ['openid', 'profile', 'email'],
      additionalScopes: '',
      grantTypeOptions: ['authorization_code', 'refresh_token'],
      additionalGrantTypes: '',
      responseTypes: 'code',
      interactionMode: 'hosted',
      interactionLoginUrl: '',
      interactionConsentUrl: '',
      enabled: 'true',
    });
  }

  private toList(value: string): string[] {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private toWords(value: string): string[] {
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  private showMessage(value: string, isError: boolean): void {
    this.message.set(value);
    this.error.set(isError);
  }

  private clearMessage(): void {
    this.message.set('');
    this.error.set(false);
  }
}
