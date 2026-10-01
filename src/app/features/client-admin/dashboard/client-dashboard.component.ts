import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortalApiService } from '../../../core/api/portal-api.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss',
})
export class ClientDashboardComponent {
  private readonly api = inject(PortalApiService);

  readonly userCount = signal('—');
  readonly clientName = signal('Loading client...');

  constructor() {
    void this.loadUserCount();
  }

  private async loadUserCount(): Promise<void> {
    const [usersResponse, clientResponse] = await Promise.all([
      this.api.request<unknown[]>('/api/users'),
      this.api.request<{ name?: string }>('/api/client-admin/settings'),
    ]);

    if (usersResponse.ok && Array.isArray(usersResponse.data)) {
      this.userCount.set(String(usersResponse.data.length));
    } else {
      this.userCount.set('—');
    }

    if (clientResponse.ok && clientResponse.data?.name) {
      this.clientName.set(clientResponse.data.name);
    } else {
      this.clientName.set('Client administration');
    }
  }
}
