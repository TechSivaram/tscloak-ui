import { Component, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { LoadingService } from './core/loading/loading.service';
import { LoadingOverlayComponent } from './core/loading/loading-overlay.component';

@Component({
  imports: [RouterOutlet, LoadingOverlayComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('tscloak-ui');

  private readonly router = inject(Router);
  private readonly loading = inject(LoadingService);

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart ||
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.loading.show();
        } else {
          this.loading.hide();
        }
      });
  }
}
