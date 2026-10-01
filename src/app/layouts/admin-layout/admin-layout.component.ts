import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BrandComponent } from '../../shared/components/brand/brand.component';
import { OidcService } from '../../core/auth/oidc.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, BrandComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly oidc = inject(OidcService);

  readonly sidebarOpen = signal(false);
  readonly profileMenuOpen = signal(false);
  readonly pageTitle = signal('Dashboard');
  readonly breadcrumb = signal('TSCloak');
  readonly displayName = signal('Administrator');
  readonly initials = signal('AD');
  readonly avatarUrl = signal<string | null>(null);
  readonly roleSummary = signal('IDP_ADMIN');
  readonly fullRoles = signal('IDP_ADMIN');

  ngOnInit(): void {
    this.updatePageTitle(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updatePageTitle(event.urlAfterRedirects));

    void this.loadUser();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
    this.profileMenuOpen.set(false);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen.update((open) => !open);
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  refreshPage(): void {
    window.location.reload();
  }

  async logout(): Promise<void> {
    this.profileMenuOpen.set(false);
    await this.oidc.logout();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.profileMenuOpen.set(false);
  }

  private async loadUser(): Promise<void> {
    try {
      const user = await this.oidc.currentUser();
      const name = user?.displayName || user?.username || 'Administrator';
      const roles = user?.roles ?? [];

      this.displayName.set(name);
      this.avatarUrl.set(
        typeof user?.['avatarUrl'] === 'string' && user['avatarUrl'].trim()
          ? user['avatarUrl'] as string
          : null,
      );

      // The legacy IDP admin console uses the fixed “AD” avatar mark
      // for the administrator account, including when the username is
      // simply “admin”. Preserve that visual behavior.
      const isIdpAdmin = roles.includes('IDP_ADMIN');
      this.initials.set(
        isIdpAdmin
          ? 'AD'
          : name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? '')
              .join('') || 'AD',
      );
      this.roleSummary.set(roles.length ? `${roles[0]} · ${roles.length} roles` : 'Administrator');
      this.fullRoles.set(roles.length ? roles.join(', ') : 'Administrator');
    } catch {
      // Keep the safe administrator fallback shown by the legacy console.
    }
  }

  private updatePageTitle(url: string): void {
    const segment = url.split('?')[0].split('/').filter(Boolean).at(-1) ?? 'dashboard';
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      clients: 'Clients',
      users: 'Users',
      roles: 'Roles',
      federation: 'Federation',
      'initial-access-tokens': 'Initial Access Tokens',
      'security-policy': 'Security Policy',
      security: 'Security & MFA',
      profile: 'Profile',
      register: 'Register',
      'reset-password': 'Reset Password',
    };

    this.pageTitle.set(titles[segment] ?? 'Administration');

    const isDashboard = segment === 'dashboard';
    this.breadcrumb.set(isDashboard ? 'TSCloak' : 'TSCloak / Administration');
  }
}
