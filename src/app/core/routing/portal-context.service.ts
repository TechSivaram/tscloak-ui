import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PortalContextService {
  constructor(private readonly router: Router) {}

  clientUrl(page = ''): string[] {
    return page
      ? ['/idp-client-admin', page]
      : ['/idp-client-admin', 'dashboard'];
  }

  navigateClient(page = 'dashboard'): Promise<boolean> {
    return this.router.navigate(this.clientUrl(page));
  }
}
