import { Component, input } from '@angular/core';

@Component({
  selector: 'app-brand',
  standalone: true,
  template: `
    <div class="brand">
      <div class="brand-mark">
        <img src="assets/tscloak-icon.png" alt="TSCloak" />
      </div>
      <div>
        <div class="brand-name">TSCloak</div>
        <div class="brand-subtitle">{{ subtitle() }}</div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; flex: 0 0 76px; }
    .brand { height: 76px; padding: 0 22px; display: flex; align-items: center; gap: 12px; min-width: 0; border-bottom: 1px solid rgba(255, 255, 255, .16); }
    .brand-mark { width: 40px; height: 40px; flex: 0 0 40px; display: grid; place-items: center; border-radius: 10px; overflow: hidden; background: #fff; }
    .brand-mark img { width: 32px; height: 32px; display: block; object-fit: contain; }
    .brand-name { color: #ffffff; font-size: 17px; font-weight: 700; }
    .brand-subtitle { margin-top: 2px; color: rgba(255,255,255,.72); font-size: 11px; }
  `,
})
export class BrandComponent {
  readonly subtitle = input('Administration');
}
