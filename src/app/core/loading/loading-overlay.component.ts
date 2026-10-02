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
      <div class="loading-indicator" role="status" aria-label="Loading">
        <div class="loading-logo-wrap" aria-hidden="true">
          <span class="loading-ring"></span>
          <img
            class="loading-logo"
            src="/assets/tscloak-icon.png"
            alt=""
          />
        </div>
        <span class="loading-text">Loading...</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }

    /*
     * Intentionally transparent: the current page remains visible underneath
     * while the overlay still captures pointer interaction.
     */
    .loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: transparent;
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

    .loading-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      color: #1d4ed8;
      user-select: none;
    }

    .loading-logo-wrap {
      position: relative;
      width: 4.25rem;
      height: 4.25rem;
      display: grid;
      place-items: center;
    }

    .loading-logo {
      position: relative;
      z-index: 1;
      width: 3rem;
      height: 3rem;
      object-fit: contain;
      animation: loading-pulse 1.25s ease-in-out infinite;
      filter: drop-shadow(0 3px 8px rgb(15 23 42 / 18%));
    }

    .loading-ring {
      position: absolute;
      inset: 0.3rem;
      border: 2px solid rgb(29 78 216 / 22%);
      border-top-color: rgb(29 78 216 / 90%);
      border-right-color: rgb(29 78 216 / 55%);
      border-radius: 50%;
      animation: loading-spin 0.9s linear infinite;
    }

    .loading-text {
      font-size: 0.82rem;
      line-height: 1;
      font-weight: 600;
      letter-spacing: 0.01em;
      text-shadow: 0 1px 3px rgb(255 255 255 / 80%);
    }

    @keyframes loading-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes loading-pulse {
      0%,
      100% {
        transform: scale(0.94);
        opacity: 0.82;
      }
      50% {
        transform: scale(1);
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .loading-overlay {
        transition: none;
      }

      .loading-logo,
      .loading-ring {
        animation: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlayComponent {
  protected readonly loading = inject(LoadingService);
}
