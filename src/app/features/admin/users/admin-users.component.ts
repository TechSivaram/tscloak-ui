import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';
import { OidcService } from '../../../core/auth/oidc.service';
import { environment } from '../../../../environments/environment';

const API = environment.idp.url;

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  enabled: boolean;
  createdAt: string;
}

export interface AdminRole {
  id?: string;
  name: string;
}

export interface AdminClientScope {
  clientId: string;
  name: string;
}

const createUserSchema = z.object({
  username: z.string().trim().min(3),
  email: z.string().trim().email(),
  password: z.string().min(8),
  clientId: z.string().trim().min(1).optional(),
});

const updateUserSchema = z.object({
  email: z.string().trim().email(),
  enabled: z.boolean(),
});

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcService);
  private readonly fb = inject(FormBuilder);

  readonly users = signal<AdminUser[]>([]);
  readonly roles = signal<AdminRole[]>([]);
  readonly clients = signal<AdminClientScope[]>([]);
  readonly selectedClientId = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formVisible = signal(false);
  readonly message = signal('');
  readonly error = signal(false);
  readonly editingUser = signal<AdminUser | null>(null);
  readonly openRoleUserId = signal<string | null>(null);
  readonly roleSearch = signal('');
  readonly roleDrafts = signal<Record<string, string[]>>({});

  readonly createForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly editForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    enabled: this.fb.nonNullable.control('true'),
  });

  ngOnInit(): void {
    void this.initialize();
  }

  async initialize(): Promise<void> {
    await this.setupClientScope();
    await this.loadUsers();
  }

  async setupClientScope(): Promise<void> {
    try {
      const clients = await firstValueFrom(
        this.http.get<AdminClientScope[]>(`${API}/api/admin/clients`, {
          headers: await this.authHeaders(),
        }),
      );

      const available = clients ?? [];
      this.clients.set(available);

      if (available.length) {
        this.selectedClientId.set(available[0].clientId);
      } else {
        this.showMessage('No clients are registered.', true);
      }
    } catch (error) {
      console.error('Unable to load client scope:', error);
      this.clients.set([]);
      this.showMessage('Unable to load clients.', true);
    }
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.clearMessage();

    try {
      const clientId = this.selectedClientId();
      const query = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';

      const headers = await this.authHeaders();

      const [usersResult, rolesResult] = await Promise.allSettled([
        firstValueFrom(
          this.http.get<AdminUser[]>(`${API}/api/users${query}`, {
            headers,
          }),
        ),
        firstValueFrom(
          this.http.get<AdminRole[]>(`${API}/api/users/roles`, {
            headers,
          }),
        ),
      ]);

      const users = usersResult.status === 'fulfilled' ? usersResult.value ?? [] : null;
      const roles = rolesResult.status === 'fulfilled' ? rolesResult.value ?? [] : null;

      if (users === null || roles === null) {
        console.error('Unable to load users or roles:', { usersResult, rolesResult });
        this.users.set(users ?? []);
        this.roles.set(roles ?? []);
        this.showMessage(
          users === null && roles === null
            ? 'Unable to load users or roles.'
            : users === null
              ? 'Unable to load users.'
              : 'Unable to load roles.',
          true,
        );
      } else {
        this.users.set(users);
        this.roles.set(roles);
        this.clearMessage();

        const drafts: Record<string, string[]> = {};
        for (const user of users) {
          drafts[user.id] = [...(user.roles ?? [])];
        }
        this.roleDrafts.set(drafts);
      }
    } catch (error) {
      console.error('Unable to load users or roles:', error);
      this.users.set([]);
      this.roles.set([]);
      this.showMessage('Unable to load users or roles.', true);
    } finally {
      this.loading.set(false);
    }
  }

  onClientScopeChange(clientId: string): void {
    this.selectedClientId.set(clientId);
    this.openRoleUserId.set(null);
    void this.loadUsers();
  }

  toggleCreateForm(): void {
    this.clearMessage();
    this.editingUser.set(null);
    this.formVisible.update((visible) => !visible);
    if (!this.formVisible()) {
      this.createForm.reset();
    }
  }

  async createUser(): Promise<void> {
    this.clearMessage();
    this.createForm.markAllAsTouched();

    if (this.createForm.invalid) {
      this.showMessage('Please complete the required fields.', true);
      return;
    }

    const raw = this.createForm.getRawValue();
    const parsed = createUserSchema.safeParse({
      username: raw.username,
      email: raw.email,
      password: raw.password,
      clientId: this.selectedClientId() || undefined,
    });

    if (!parsed.success) {
      this.showMessage(parsed.error.issues[0]?.message ?? 'Invalid user details.', true);
      return;
    }

    this.saving.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post(`${API}/api/users`, parsed.data, {
          headers: await this.authHeaders(),
        }),
      );

      if (response) {
        this.createForm.reset();
        this.formVisible.set(false);
        await this.loadUsers();
      }
    } catch (error) {
      console.error('Unable to create user:', error);
      this.showMessage('Unable to create user.', true);
    } finally {
      this.saving.set(false);
    }
  }

  openUserEditor(user: AdminUser): void {
    this.clearMessage();
    this.editingUser.set(user);
    this.formVisible.set(false);
    this.editForm.setValue({
      email: user.email ?? '',
      enabled: String(user.enabled),
    });

    setTimeout(() => {
      document.getElementById('userEditPanel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  closeUserEditor(): void {
    this.editingUser.set(null);
    this.editForm.reset({ email: '', enabled: 'true' });
    this.clearMessage();
  }

  async saveUser(): Promise<void> {
    const user = this.editingUser();
    if (!user) return;

    this.clearMessage();
    this.editForm.markAllAsTouched();

    if (this.editForm.invalid) {
      this.showMessage('Please enter a valid email address.', true);
      return;
    }

    const raw = this.editForm.getRawValue();
    const parsed = updateUserSchema.safeParse({
      email: raw.email,
      enabled: raw.enabled === 'true',
    });

    if (!parsed.success) {
      this.showMessage(parsed.error.issues[0]?.message ?? 'Invalid user details.', true);
      return;
    }

    this.saving.set(true);

    try {
      const clientId = this.selectedClientId();
      const query = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';

      await firstValueFrom(
        this.http.put(
          `${API}/api/users/${encodeURIComponent(user.id)}${query}`,
          parsed.data,
          { headers: await this.authHeaders() },
        ),
      );

      this.showMessage('User updated.');
      this.editingUser.set(null);
      await this.loadUsers();
    } catch (error) {
      console.error('Unable to update user:', error);
      this.showMessage('Unable to update user.', true);
    } finally {
      this.saving.set(false);
    }
  }

  toggleRolePicker(user: AdminUser): void {
    if (this.openRoleUserId() === user.id) {
      this.openRoleUserId.set(null);
      return;
    }

    this.roleSearch.set('');
    this.openRoleUserId.set(user.id);
  }

  isRoleSelected(user: AdminUser, roleName: string): boolean {
    return (this.roleDrafts()[user.id] ?? user.roles ?? []).includes(roleName);
  }

  toggleRole(user: AdminUser, roleName: string): void {
    const drafts = { ...this.roleDrafts() };
    const current = drafts[user.id] ?? [];

    drafts[user.id] = current.includes(roleName)
      ? current.filter((role) => role !== roleName)
      : [...current, roleName];

    this.roleDrafts.set(drafts);
  }

  clearRoles(user: AdminUser): void {
    this.roleDrafts.update((drafts) => ({ ...drafts, [user.id]: [] }));
  }

  async saveRoles(user: AdminUser): Promise<void> {
    this.saving.set(true);
    this.clearMessage();

    try {
      const clientId = this.selectedClientId();
      const query = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';
      const roles = this.roleDrafts()[user.id] ?? [];

      await firstValueFrom(
        this.http.put(
          `${API}/api/users/${encodeURIComponent(user.id)}/roles${query}`,
          { roles },
          { headers: await this.authHeaders() },
        ),
      );

      this.showMessage('User roles updated.');
      this.openRoleUserId.set(null);
      await this.loadUsers();
    } catch (error) {
      console.error('Unable to update user roles:', error);
      this.showMessage('Unable to update user roles.', true);
    } finally {
      this.saving.set(false);
    }
  }

  filteredRoles(): AdminRole[] {
    const query = this.roleSearch().trim().toLowerCase();
    if (!query) return this.roles();
    return this.roles().filter((role) => role.name.toLowerCase().includes(query));
  }

  roleSummary(user: AdminUser): string {
    const selected = this.roleDrafts()[user.id] ?? user.roles ?? [];
    return selected.length
      ? `${selected.length} role${selected.length === 1 ? '' : 's'} selected`
      : 'No roles assigned';
  }

  formatCreated(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }

  trackByUserId(_: number, user: AdminUser): string {
    return user.id;
  }

  trackByRole(_: number, role: AdminRole): string {
    return role.id ?? role.name;
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
