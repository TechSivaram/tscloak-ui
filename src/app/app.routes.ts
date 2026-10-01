import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { ClientAdminLayoutComponent } from './layouts/client-admin-layout/client-admin-layout.component';
import { PublicHomeComponent } from './pages/public-home/public-home.component';
import { PortalLoginComponent } from './pages/portal-login/portal-login.component';
import { AdminDashboardComponent } from './features/admin/dashboard/admin-dashboard.component';
import { AdminClientsComponent } from './features/admin/clients/admin-clients.component';
import { AdminUsersComponent } from './features/admin/users/admin-users.component';
import { AdminRolesComponent } from './features/admin/roles/admin-roles.component';
import { AdminFederationComponent } from './features/admin/federation/admin-federation.component';
import { ClientDashboardComponent } from './features/client-admin/dashboard/client-dashboard.component';
import { OidcCallbackComponent } from './features/auth/oidc-callback/oidc-callback.component';
import { AdminInitialAccessTokensComponent } from './features/admin/initial-access-tokens/admin-initial-access-tokens.component';
import { AdminSecurityPolicyComponent } from './features/admin/security-policy/admin-security-policy.component';
import { SecurityMfaComponent } from './shared/security/security-mfa.component';
import { ProfileComponent } from './shared/profile/profile.component';
import { AdminRegisterComponent } from './features/admin/register/admin-register.component';
import { AdminResetPasswordComponent } from './features/admin/reset-password/admin-reset-password.component';
import { ClientUsersComponent } from './features/client-admin/users/client-users.component';
import { ClientFederationComponent } from './features/client-admin/federation/client-federation.component';
import { ClientSettingsComponent } from './features/client-admin/settings/client-settings.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: PublicHomeComponent, title: 'TSCloak | Secure Identities. Trusted Access.' },
  { path: 'idp-admin/register', component: AdminRegisterComponent, title: 'TSCloak | Register Application' },
  { path: 'idp-admin/reset-password', component: AdminResetPasswordComponent, title: 'TSCloak | Reset Password' },

  {
    path: 'idp-admin',
    children: [
      { path: '', pathMatch: 'full', component: PortalLoginComponent, title: 'TSCloak Administration' },
      { path: 'callback.html', component: OidcCallbackComponent, data: { portal: 'idp-admin' }, title: 'TSCloak - Signing in' },
      {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [authGuard('idp-admin')],
        children: [
          { path: 'dashboard', component: AdminDashboardComponent, title: 'TSCloak | Dashboard' },
          { path: 'clients', component: AdminClientsComponent, title: 'TSCloak | Clients' },
          { path: 'users', component: AdminUsersComponent, title: 'TSCloak | Users' },
          { path: 'roles', component: AdminRolesComponent, title: 'TSCloak | Roles' },
          { path: 'federation', component: AdminFederationComponent, title: 'TSCloak | Federation' },
          { path: 'initial-access-tokens', component: AdminInitialAccessTokensComponent, title: 'TSCloak | Initial Access Tokens' },
          { path: 'security-policy', component: AdminSecurityPolicyComponent, title: 'TSCloak | Security Policy' },
          { path: 'security', component: SecurityMfaComponent, title: 'TSCloak | Security & MFA' },
          { path: 'profile', component: ProfileComponent, title: 'TSCloak | Profile' },
                  ],
      },
    ],
  },

  {
    path: 'idp-client-admin',
    children: [
      {
        path: 'callback.html',
        component: OidcCallbackComponent,
        data: { portal: 'idp-client-admin' },
        title: 'TSCloak | Signing in',
      },
      {
        path: '',
        component: ClientAdminLayoutComponent,
        canActivate: [authGuard('idp-client-admin')],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'dashboard',
          },
          { path: 'dashboard', component: ClientDashboardComponent, title: 'TSCloak | Client Dashboard' },
          { path: 'users', component: ClientUsersComponent, title: 'TSCloak | Client Users' },
          { path: 'federation', component: ClientFederationComponent, title: 'TSCloak | Client Federation' },
          { path: 'settings', component: ClientSettingsComponent, title: 'TSCloak | Client Settings' },
          { path: 'security', component: SecurityMfaComponent, title: 'TSCloak | Security & MFA' },
          { path: 'profile', component: ProfileComponent, title: 'TSCloak | Profile' },
        ],
      },
      {
        path: ':clientId',
        pathMatch: 'full',
        component: PortalLoginComponent,
        title: 'TSCloak | Client Administration',
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
