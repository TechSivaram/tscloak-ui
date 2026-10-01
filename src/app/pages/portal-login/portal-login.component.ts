import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OidcService } from '../../core/auth/oidc.service';

@Component({
  selector: 'app-portal-login',
  standalone: true,
  templateUrl: './portal-login.component.html',
  styleUrl: './portal-login.component.scss',
})
export class PortalLoginComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly oidc = inject(OidcService);

  readonly clientId = this.route.snapshot.paramMap.get('clientId');
  readonly isClient = !!this.clientId;
  loading = false;
  error = '';

  async ngOnInit(): Promise<void> {
    if (this.isClient && this.clientId) {
      sessionStorage.setItem('tscloak_client_admin_client_id', this.clientId);
    }
    await this.signIn();
  }

  async signIn(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      await this.oidc.startLogin();
    } catch (error) {
      this.loading = false;
      this.error = error instanceof Error ? error.message : 'Unable to start authentication.';
    }
  }
}
