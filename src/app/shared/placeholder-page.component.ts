import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  template: `<section class="placeholder">
    <p class="eyebrow">TSCloak</p>
    <h2>{{ title }}</h2>
    <p>
      This page is wired into the Angular route and layout. Its full source implementation will be
      migrated from the corresponding legacy page.
    </p>
  </section>`,
  styles: [
    `
      .placeholder {
        padding: 34px;
        border: 1px solid #e2e8e3;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 6px 24px rgba(16, 50, 22, 0.07);
      }
      h2 {
        margin: 0 0 8px;
        font-size: 28px;
      }
      .eyebrow {
        color: #138808;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .placeholder p:last-child {
        color: #58705d;
      }
    `,
  ],
})
export class PlaceholderPageComponent {
  readonly title = inject(ActivatedRoute).snapshot.data['title'] as string;
}
