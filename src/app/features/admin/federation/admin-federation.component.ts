import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';
import { OidcService } from '../../../core/auth/oidc.service';
import { environment } from '../../../../environments/environment';

const API = environment.idp.url;

export interface FederationProvider {
  id: string;
  name: string;
  type: string;
  issuer: string;
  clientId: string;
  scopes: string[];
  enabled: boolean;
}

const providerSchema = z.object({
  name: z.string().trim().min(2),
  type: z.literal('oidc'),
  issuer: z.string().trim().url(),
  clientId: z.string().trim().min(1),
  scopes: z.array(z.string().trim().min(1)),
  enabled: z.boolean(),
});

type ProviderPayload = z.infer<typeof providerSchema> & { clientSecret?: string };

@Component({
  selector: 'app-admin-federation',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-federation.component.html',
  styleUrl: './admin-federation.component.scss',
})
export class AdminFederationComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcService);
  private readonly fb = inject(FormBuilder);

  readonly providers = signal<FederationProvider[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formVisible = signal(false);
  readonly editingProvider = signal<FederationProvider | null>(null);
  readonly message = signal('');
  readonly error = signal(false);
  readonly deleteTarget = signal<FederationProvider | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    type: ['oidc', [Validators.required]],
    issuer: ['', [Validators.required]],
    clientId: ['', [Validators.required]],
    clientSecret: [''],
    scopes: ['openid profile email'],
    enabled: ['true', [Validators.required]],
  });

  ngOnInit(): void {
    void this.loadProviders();
  }

  async loadProviders(): Promise<void> {
    this.loading.set(true);
    this.clearMessage();
    try {
      const providers = await firstValueFrom(
        this.http.get<FederationProvider[]>(`${API}/api/federation/providers`, {
          headers: await this.authHeaders(),
        }),
      );
      this.providers.set(providers ?? []);
    } catch (error) {
      console.error('Unable to load federation providers:', error);
      this.providers.set([]);
      this.showMessage('Unable to load federation providers.', true);
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.clearMessage();
    this.editingProvider.set(null);
    this.form.reset({
      name: '',
      type: 'oidc',
      issuer: '',
      clientId: '',
      clientSecret: '',
      scopes: 'openid profile email',
      enabled: 'true',
    });
    this.form.controls.clientSecret.setValidators([]);
    this.form.controls.clientSecret.updateValueAndValidity();
    this.formVisible.set(true);
    this.scrollToForm();
  }

  openEdit(provider: FederationProvider): void {
    this.clearMessage();
    this.editingProvider.set(provider);
    this.form.reset({
      name: provider.name,
      type: provider.type,
      issuer: provider.issuer,
      clientId: provider.clientId,
      clientSecret: '',
      scopes: Array.isArray(provider.scopes) ? provider.scopes.join(' ') : '',
      enabled: String(provider.enabled),
    });
    this.form.controls.clientSecret.clearValidators();
    this.form.controls.clientSecret.updateValueAndValidity();
    this.formVisible.set(true);
    this.scrollToForm();
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.editingProvider.set(null);
    this.form.reset();
    this.clearMessage();
  }

  async saveProvider(): Promise<void> {
    this.clearMessage();
    this.form.markAllAsTouched();

    const raw = this.form.getRawValue();
    const scopes = raw.scopes
      .split(/[\s,]+/)
      .map((scope) => scope.trim())
      .filter(Boolean);

    const parsed = providerSchema.safeParse({
      name: raw.name.trim(),
      type: raw.type,
      issuer: raw.issuer.trim(),
      clientId: raw.clientId.trim(),
      scopes,
      enabled: raw.enabled === 'true',
    });

    if (!parsed.success) {
      this.showMessage(parsed.error.issues[0]?.message ?? 'Please complete the required fields.', true);
      return;
    }

    const secret = raw.clientSecret.trim();
    const editing = this.editingProvider();
    const payload: ProviderPayload = { ...parsed.data };

    if (!editing || secret) {
      if (!secret && !editing) {
        this.showMessage('Client secret is required when creating a provider.', true);
        return;
      }
      payload.clientSecret = secret;
    }

    this.saving.set(true);
    try {
      if (editing && !editing.id) {
        this.showMessage('Unable to update federation provider.', true);
        return;
      }

      const id = editing?.id;
      await firstValueFrom(
        editing
          ? this.http.patch(`${API}/api/federation/providers/${encodeURIComponent(id as string)}`, payload, {
              headers: await this.authHeaders(),
            })
          : this.http.post(`${API}/api/federation/providers`, payload, {
              headers: await this.authHeaders(),
            }),
      );

      const successMessage = editing
        ? 'Federation provider updated.'
        : 'Federation provider created.';
      this.closeForm();
      await this.loadProviders();
      this.showMessage(successMessage);
    } catch (error) {
      console.error('Unable to save federation provider:', error);
      this.showMessage('Unable to save federation provider.', true);
    } finally {
      this.saving.set(false);
    }
  }

  async toggleProvider(provider: FederationProvider): Promise<void> {
    this.clearMessage();
    try {
      await firstValueFrom(
        this.http.patch(
          `${API}/api/federation/providers/${encodeURIComponent(provider.id)}`,
          { enabled: !provider.enabled },
          { headers: await this.authHeaders() },
        ),
      );
      this.showMessage(`Provider ${provider.enabled ? 'disabled' : 'enabled'}.`);
      await this.loadProviders();
    } catch (error) {
      console.error('Unable to update provider status:', error);
      this.showMessage('Unable to update provider status.', true);
    }
  }

  requestDeleteProvider(provider: FederationProvider): void {
    this.deleteTarget.set(provider);
  }

  cancelDeleteProvider(): void {
    this.deleteTarget.set(null);
  }

  async confirmDeleteProvider(): Promise<void> {
    const provider = this.deleteTarget();
    if (!provider) return;
    this.deleteTarget.set(null);

    this.clearMessage();
    try {
      await firstValueFrom(
        this.http.delete(`${API}/api/federation/providers/${encodeURIComponent(provider.id)}`, {
          headers: await this.authHeaders(),
        }),
      );
      this.showMessage('Federation provider deleted.');
      await this.loadProviders();
    } catch (error) {
      console.error('Unable to delete federation provider:', error);
      this.showMessage('Unable to delete federation provider.', true);
    }
  }

  trackById(_index: number, provider: FederationProvider): string {
    return provider.id;
  }

  private async authHeaders(): Promise<HttpHeaders> {
    const token = await this.oidc.accessToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    });
  }

  private scrollToForm(): void {
    setTimeout(() => {
      document.getElementById('providerFormPanel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  private showMessage(value: string, isError = false): void {
    this.message.set(value);
    this.error.set(isError);
  }

  private clearMessage(): void {
    this.message.set('');
    this.error.set(false);
  }
}
