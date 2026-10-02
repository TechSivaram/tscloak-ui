import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from './loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  template: `
    <div
      class="loading-overlay"
      [class.loading-overlay--visible]="loading.loading()"
      [attr.aria-hidden]="!loading.loading()"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="loading-card" role="status">
        <span class="loading-spinner" aria-hidden="true"></span>
        <span>Loading...</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(15, 23, 42, 0.18);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 140ms ease, visibility 140ms ease;
    }

    .loading-overlay--visible {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .loading-card {
      display: inline-flex;
      align-items: center;
      gap: 0.7rem;
      min-width: 120px;
      justify-content: center;
      padding: 0.8rem 1rem;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.96);
      color: #334155;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .loading-spinner {
      width: 1.1rem;
      height: 1.1rem;
      flex: 0 0 auto;
      border: 2px solid rgba(71, 85, 105, 0.22);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: loading-spin 0.75s linear infinite;
    }

    @keyframes loading-spin {
      to { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      .loading-overlay {
        transition: none;
      }

      .loading-spinner {
        animation: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlayComponent {
  protected readonly loading = inject(LoadingService);
}
