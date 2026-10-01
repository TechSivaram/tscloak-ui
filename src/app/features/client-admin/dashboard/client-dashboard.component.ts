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

  constructor() {
    void this.loadUserCount();
  }

  private async loadUserCount(): Promise<void> {
    const response = await this.api.request<unknown[]>('/api/users');

    if (response.ok && Array.isArray(response.data)) {
      this.userCount.set(String(response.data.length));
      return;
    }

    this.userCount.set('—');
  }
}
