import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PortalApiService } from '../../../core/api/portal-api.service';
interface User {
  id: string;
  username: string;
  email: string;
  roles?: string[];
  enabled: boolean;
  createdAt: string;
}
@Component({
  selector: 'app-client-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-users.component.html',
  styleUrl: './client-users.component.scss',
})
export class ClientUsersComponent {
  private readonly api = inject(PortalApiService);
  readonly users = signal<User[]>([]);
  readonly editing = signal<User | null>(null);
  readonly create = signal(false);
  readonly message = signal('');
  form: any = { username: '', email: '', password: '', enabled: true };
  constructor() {
    void this.load();
  }
  async load() {
    const r = await this.api.request<User[]>('/api/users');
    this.users.set(r.ok && r.data ? r.data : []);
  }
  openCreate() {
    this.form = { username: '', email: '', password: '', enabled: true };
    this.create.set(true);
    this.editing.set(null);
  }
  openEdit(u: User) {
    this.form = { email: u.email, enabled: u.enabled };
    this.editing.set(u);
    this.create.set(false);
  }
  close() {
    this.editing.set(null);
    this.create.set(false);
  }
  async save() {
    if (this.create()) {
      const r = await this.api.request('/api/users', {
        method: 'POST',
        body: {
          username: this.form.username,
          email: this.form.email,
          password: this.form.password,
        },
      });
      if (r.ok) {
        this.message.set('User created.');
        this.close();
        await this.load();
      } else this.message.set('Unable to create user.');
    } else {
      const u = this.editing();
      if (!u) return;
      const r = await this.api.request(`/api/users/${encodeURIComponent(u.id)}`, {
        method: 'PUT',
        body: { email: this.form.email, enabled: this.form.enabled },
      });
      if (r.ok) {
        this.message.set('User updated.');
        this.close();
        await this.load();
      } else this.message.set('Unable to update user.');
    }
  }
}
