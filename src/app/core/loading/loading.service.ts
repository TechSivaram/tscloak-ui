import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly activeOperations = signal(0);

  readonly loading = computed(() => this.activeOperations() > 0);

  show(): void {
    this.activeOperations.update((count) => count + 1);
  }

  hide(): void {
    this.activeOperations.update((count) => Math.max(0, count - 1));
  }
}
