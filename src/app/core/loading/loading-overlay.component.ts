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
          <span class="loading-ring-highlight"></span>
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
  styles: [
    `
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
        transition:
          opacity 140ms ease,
          visibility 140ms ease;
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
        gap: 0.7rem;
        color: #1f2937;
        user-select: none;
      }

      .loading-logo-wrap {
        position: relative;
        width: 7.5rem;
        height: 7.5rem;
        display: grid;
        place-items: center;
      }

      /*
       * Tiranga ring:
       * saffron -> white -> India green, continuously rotating around the
       * original TSCloak icon.
       */
      .loading-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: conic-gradient(
          from 0deg,
          #ff9933 0deg 120deg,
          #ffffff 120deg 240deg,
          #138808 240deg 360deg
        );
        -webkit-mask: radial-gradient(
          farthest-side,
          transparent calc(100% - 0.38rem),
          #000 calc(100% - 0.37rem)
        );
        mask: radial-gradient(
          farthest-side,
          transparent calc(100% - 0.38rem),
          #000 calc(100% - 0.37rem)
        );
        animation: loading-spin 1.35s linear infinite;
        filter: drop-shadow(0 0 5px rgb(255 153 51 / 35%))
          drop-shadow(0 0 7px rgb(19 136 8 / 25%));
      }

      /* Gives the white section a visible edge on light pages. */
      .loading-ring-highlight {
        position: absolute;
        inset: 0.16rem;
        border: 1px solid rgb(255 255 255 / 55%);
        border-radius: 50%;
        animation: loading-spin-reverse 2.2s linear infinite;
        pointer-events: none;
      }

      .loading-logo {
        position: relative;
        z-index: 1;
        width: 4.2rem;
        height: 4.2rem;
        object-fit: contain;
        animation: loading-pulse 1.25s ease-in-out infinite;
        filter: drop-shadow(0 4px 10px rgb(15 23 42 / 22%));
      }

      .loading-text {
        font-size: 0.84rem;
        line-height: 1;
        font-weight: 600;
        letter-spacing: 0.01em;
        color: #334155;
        text-shadow: 0 1px 3px rgb(255 255 255 / 85%);
      }

      @keyframes loading-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes loading-spin-reverse {
        to {
          transform: rotate(-360deg);
        }
      }

      @keyframes loading-pulse {
        0%,
        100% {
          transform: scale(0.94);
          opacity: 0.86;
        }

        50% {
          transform: scale(1.04);
          opacity: 1;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlayComponent {
  protected readonly loading = inject(LoadingService);
}
