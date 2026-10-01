import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OidcService } from '../../../core/auth/oidc.service';

@Component({
  selector: 'app-oidc-callback',
  standalone: true,
  templateUrl: './oidc-callback.component.html',
  styleUrl: './oidc-callback.component.scss',
})
export class OidcCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly oidc = inject(OidcService);

  status = 'Completing authentication.';
  error = false;

  private getPortal(): 'idp-admin' | 'idp-client-admin' | null {
    const pathname = window.location.pathname.replace(/\/+$/, '');

    if (pathname === '/idp-client-admin/callback.html') {
      return 'idp-client-admin';
    }

    if (pathname === '/idp-admin/callback.html') {
      return 'idp-admin';
    }

    const routePortal = this.route.snapshot.data['portal'];
    return routePortal === 'idp-admin' || routePortal === 'idp-client-admin'
      ? routePortal
      : null;
  }

  async ngOnInit(): Promise<void> {
    const portal = this.getPortal();

    if (!portal) {
      this.error = true;
      this.status = 'Invalid OIDC callback URL.';
      return;
    }

    try {
      await this.oidc.completeLogin(portal, (message) => {
        this.status = message;
      });
    } catch (error) {
      this.error = true;
      this.status = error instanceof Error
        ? error.message
        : 'Unable to complete authentication.';
    }
  }
}
