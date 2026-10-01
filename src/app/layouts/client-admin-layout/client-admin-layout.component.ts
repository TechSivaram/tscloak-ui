import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BrandComponent } from '../../shared/components/brand/brand.component';
import { OidcService } from '../../core/auth/oidc.service';

@Component({ selector:'app-client-admin-layout', standalone:true, imports:[RouterLink,RouterLinkActive,RouterOutlet,BrandComponent], templateUrl:'./client-admin-layout.component.html', styleUrl:'./client-admin-layout.component.scss' })
export class ClientAdminLayoutComponent implements OnInit {
private readonly router=inject(Router);private readonly oidc=inject(OidcService);
readonly sidebarOpen=signal(false);readonly menuOpen=signal(false);readonly pageTitle=signal('Dashboard');readonly showSecurityBreadcrumb=signal(false);readonly displayName=signal('Administrator');readonly initials=signal('AD');readonly avatarUrl=signal<string | null>(null);readonly roleSummary=signal('IDP_CLIENT_ADMIN');readonly fullRoles=signal('IDP_CLIENT_ADMIN');
  ngOnInit(){this.update(this.router.url);this.router.events.pipe(filter((e):e is NavigationEnd=>e instanceof NavigationEnd)).subscribe(e=>this.update(e.urlAfterRedirects));void this.loadUser()}
  toggleSidebar(){this.sidebarOpen.update(v=>!v);this.menuOpen.set(false)}closeSidebar(){this.sidebarOpen.set(false)}toggleMenu(e:MouseEvent){e.stopPropagation();this.menuOpen.update(v=>!v)}logout(){this.oidc.logout()}refresh(){location.reload()}
  @HostListener('document:click') closeMenu(){this.menuOpen.set(false)}
  private update(url:string){const s=url.split('?')[0].split('/').filter(Boolean).at(-1)||'dashboard';const map:Record<string,string>={dashboard:'Dashboard',users:'Users',federation:'Federation',settings:'Client settings',security:'Security & MFA',profile:'Profile'};this.pageTitle.set(map[s]||'Client workspace');this.showSecurityBreadcrumb.set(s==='security')}
  private async loadUser(){try{const u=await this.oidc.currentUser();const n=u?.displayName||u?.username||'Administrator';const roles=u?.roles||[];this.displayName.set(n);this.avatarUrl.set(typeof u?.['avatarUrl']==='string' && u['avatarUrl'].trim() ? u['avatarUrl'] as string : null);this.initials.set(n.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'AD');this.roleSummary.set(roles.length?`${roles[0]} · ${roles.length} roles`:'IDP_CLIENT_ADMIN');this.fullRoles.set(roles.length?roles.join(', '):'IDP_CLIENT_ADMIN')}catch{}}
}
