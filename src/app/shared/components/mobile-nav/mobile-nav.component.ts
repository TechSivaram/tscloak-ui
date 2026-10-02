import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  template: `
    <button
      class="menu-button"
      type="button"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="open() ? 'Close navigation' : 'Open navigation'"
      (click)="toggle()"
    >
      ☰
    </button>
    @if (open()) {
      <button
        class="mobile-overlay"
        type="button"
        aria-label="Close navigation"
        (click)="close()"
      ></button>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .menu-button {
      display: none;
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 24px;
      line-height: 1;
      padding: 8px;
      cursor: pointer;
    }
    .mobile-overlay {
      position: fixed;
      inset: 0;
      z-index: 90;
      width: 100%;
      height: 100%;
      padding: 0;
      border: 0;
      background: rgba(15, 23, 42, 0.45);
    }
    @media (max-width: 760px) {
      .menu-button {
        display: block;
      }
    }
  `,
})
export class MobileNavComponent {
  readonly changed = output<boolean>();
  readonly open = signal(false);

  toggle(): void {
    this.open.update((value) => !value);
    this.changed.emit(this.open());
  }

  close(): void {
    this.open.set(false);
    this.changed.emit(false);
  }
}
