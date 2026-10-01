import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { OidcService } from '../../../core/auth/oidc.service';
import { environment } from '../../../../environments/environment';

interface DashboardResponse {
  clients?: number;
  users?: number;
  initialAccessTokens?: number;
  roles?: number;
  status?: {
    oidcProvider?: string;
    database?: string;
    registration?: string;
    securityPolicy?: string;
  };
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcService);

  readonly clientCount = signal('—');
  readonly userCount = signal('—');
  readonly tokenCount = signal('—');
  readonly roleCount = signal('—');

  readonly overallStatus = signal('—');
  readonly oidcProviderStatus = signal('—');
  readonly databaseStatus = signal('—');
  readonly registrationStatus = signal('—');
  readonly securityPolicyStatus = signal('—');
  readonly loading = signal(false);
  readonly displayName = signal('Administrator');

  ngOnInit(): void {
    void this.initialize();
  }

  async loadDashboard(): Promise<void> {
    this.loading.set(true);

    try {
      const accessToken = await this.oidc.accessToken();
      const headers = new HttpHeaders({
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      });

      const data = await this.http
        .get<DashboardResponse>(`${environment.idp.url}/api/admin/dashboard`, { headers })
        .toPromise();

      this.clientCount.set(this.value(data?.clients));
      this.userCount.set(this.value(data?.users));
      this.tokenCount.set(this.value(data?.initialAccessTokens));
      this.roleCount.set(this.value(data?.roles));

      const status = data?.status;
      this.oidcProviderStatus.set(this.value(status?.oidcProvider));
      this.databaseStatus.set(this.value(status?.database));
      this.registrationStatus.set(this.value(status?.registration));
      this.securityPolicyStatus.set(this.value(status?.securityPolicy));
      this.overallStatus.set(this.getOverallStatus(status));
    } catch (error) {
      console.error('Unable to load dashboard data:', error);
      this.clientCount.set('—');
      this.userCount.set('—');
      this.tokenCount.set('—');
      this.roleCount.set('—');
      this.overallStatus.set('—');
      this.oidcProviderStatus.set('—');
      this.databaseStatus.set('—');
      this.registrationStatus.set('—');
      this.securityPolicyStatus.set('—');
    } finally {
      this.loading.set(false);
    }
  }

  private async initialize(): Promise<void> {
    try {
      const user = await this.oidc.currentUser();
      const name = user?.displayName || user?.username || user?.email || 'Administrator';
      this.displayName.set(name);
    } catch {
      // Keep the default display name.
    }

    await this.loadDashboard();
  }

  private value(value: unknown): string {
    return value === null || value === undefined ? '—' : String(value);
  }

  private getOverallStatus(status: DashboardResponse['status']): string {
    if (!status) return '—';

    const values = Object.values(status).filter((value) => value !== undefined && value !== null);
    if (!values.length) return '—';

    return values.every((value) =>
      value === 'Operational' || value === 'Connected' || value === 'Active',
    )
      ? 'Operational'
      : 'Attention required';
  }
}
