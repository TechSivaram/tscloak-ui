import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PortalApiService } from '../../../core/api/portal-api.service';

interface TokenRow { id: string; policies: string[]; expiresAt?: string | null; createdAt: string; }
@Component({ selector:'app-admin-initial-access-tokens', standalone:true, imports:[CommonModule, FormsModule], templateUrl:'./admin-initial-access-tokens.component.html', styleUrl:'./admin-initial-access-tokens.component.scss' })
export class AdminInitialAccessTokensComponent {
  private readonly api=inject(PortalApiService); readonly tokens=signal<TokenRow[]>([]); readonly loading=signal(false); readonly modal=signal(false); readonly email=signal(''); readonly modalError=signal(''); readonly message=signal(''); readonly result=signal(''); readonly busy=signal(false); readonly revokeTarget=signal<string | null>(null);
  constructor(){ void this.load(); }
  async load(){ this.loading.set(true); const r=await this.api.request<TokenRow[]>('/api/admin/initial-access-tokens'); this.tokens.set(r.ok && r.data ? r.data : []); this.loading.set(false); }
  open(){this.email.set('');this.modalError.set('');this.modal.set(true)} close(){if(!this.busy())this.modal.set(false)}
  async create(send=false){ const email=this.email().trim(); if(send && (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))){this.modalError.set('Enter a valid email address.');return;} this.busy.set(true); this.modalError.set(''); const r=await this.api.request<{token:string}>('/api/admin/initial-access-tokens',{method:'POST',body:send?{email}:{}}); this.busy.set(false); if(!r.ok||!r.data){this.modalError.set('Unable to create token.');return;} this.modal.set(false); const token=r.data.token; this.result.set(`Registration link:\n${window.location.origin}/idp-admin/register?initial_access_token=${encodeURIComponent(token)}\n\nInitial access token:\n${token}`); this.message.set(send?`Registration token created and sent to ${email}.`:'Registration token created.'); await this.load(); }
  requestRevoke(id:string){this.revokeTarget.set(id)}
  cancelRevoke(){this.revokeTarget.set(null)}
  async confirmRevoke(){const id=this.revokeTarget(); if(!id)return; this.revokeTarget.set(null); const r=await this.api.request(`/api/admin/initial-access-tokens/${encodeURIComponent(id)}`,{method:'DELETE'}); if(r.ok){this.message.set('Token revoked.');await this.load()}else this.message.set('Unable to revoke token.')}
}
