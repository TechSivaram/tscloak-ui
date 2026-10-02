import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';
import { OidcService } from '../../../core/auth/oidc.service';
import { environment } from '../../../../environments/environment';

const API = environment.idp.url;

export interface AdminRole {
  id: string;
  name: string;
  description?: string | null;
}

const roleSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

type RolePayload = z.infer<typeof roleSchema>;

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-roles.component.html',
  styleUrl: './admin-roles.component.scss',
})
export class AdminRolesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcService);
  private readonly fb = inject(FormBuilder);

  readonly roles = signal<AdminRole[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formVisible = signal(false);
  readonly editingRole = signal<AdminRole | null>(null);
  readonly message = signal('');
  readonly error = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
  });

  readonly editForm = this.fb.nonNullable.group({
    description: [''],
  });

  ngOnInit(): void {
    void this.loadRoles();
  }

  async loadRoles(): Promise<void> {
    this.loading.set(true);
    this.clearMessage();

    try {
      const roles = await firstValueFrom(
        this.http.get<AdminRole[]>(`${API}/api/users/roles`, {
          headers: await this.authHeaders(),
        }),
      );
      this.roles.set(roles ?? []);
    } catch (error) {
      console.error('Unable to load roles:', error);
      this.roles.set([]);
      this.showMessage('Unable to load roles.', true);
    } finally {
      this.loading.set(false);
    }
  }

  toggleForm(): void {
    this.clearMessage();
    this.editingRole.set(null);
    this.form.reset();
    this.formVisible.set(true);
    setTimeout(() => {
      document.getElementById('roleFormPanel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  cancelForm(): void {
    this.formVisible.set(false);
    this.form.reset();
    this.clearMessage();
  }

  openRoleEditor(role: AdminRole): void {
    this.clearMessage();
    this.formVisible.set(false);
    this.editingRole.set(role);
    this.editForm.reset({ description: role.description ?? '' });

    setTimeout(() => {
      document.getElementById('roleEditPanel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  closeRoleEditor(): void {
    this.editingRole.set(null);
    this.editForm.reset();
    this.clearMessage();
  }

  async saveRole(): Promise<void> {
    const role = this.editingRole();
    if (!role) {
      return;
    }

    this.clearMessage();
    this.editForm.markAllAsTouched();
    this.saving.set(true);

    try {
      await firstValueFrom(
        this.http.put(
          `${API}/api/users/roles/${encodeURIComponent(role.id)}`,
          {
            description: this.editForm.getRawValue().description.trim() || undefined,
          },
          {
            headers: await this.authHeaders(),
          },
        ),
      );

      this.editingRole.set(null);
      this.editForm.reset();
      await this.loadRoles();
    } catch (error) {
      console.error('Unable to update role:', error);
      this.showMessage('Unable to update role.', true);
    } finally {
      this.saving.set(false);
    }
  }

  async createRole(): Promise<void> {
    this.clearMessage();
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.showMessage('Please complete the required fields.', true);
      return;
    }

    const raw = this.form.getRawValue();
    const payload: RolePayload = {
      name: raw.name.trim(),
      description: raw.description.trim() || undefined,
    };

    const parsed = roleSchema.safeParse(payload);
    if (!parsed.success) {
      this.showMessage(parsed.error.issues[0]?.message ?? 'Invalid role details.', true);
      return;
    }

    this.saving.set(true);

    try {
      await firstValueFrom(
        this.http.post(`${API}/api/users/roles`, parsed.data, {
          headers: await this.authHeaders(),
        }),
      );

      this.formVisible.set(false);
      this.form.reset();
      await this.loadRoles();
    } catch (error) {
      console.error('Unable to create role:', error);
      this.showMessage('Unable to create role.', true);
    } finally {
      this.saving.set(false);
    }
  }

  trackById(_index: number, role: AdminRole): string {
    return role.id;
  }

  private async authHeaders(): Promise<HttpHeaders> {
    const token = await this.oidc.accessToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    });
  }

  private showMessage(message: string, isError = false): void {
    this.message.set(message);
    this.error.set(isError);
  }

  private clearMessage(): void {
    this.message.set('');
    this.error.set(false);
  }
}
