import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export interface FlyRequest {
  from: DOMRect;
  color: string;
  id: number;
}

/** Global overlay state. One source of truth so overlays never stack. */
@Injectable({ providedIn: 'root' })
export class UiStore {
  private readonly doc = inject(DOCUMENT);

  readonly cartOpen = signal(false);
  readonly searchOpen = signal(false);
  readonly menuOpen = signal(false);
  /** Requested "fly to bag" animation, consumed by the header */
  readonly fly = signal<FlyRequest | null>(null);
  /** When the page wants a light header (e.g. over bone sections) */
  readonly headerTone = signal<'dark' | 'bone'>('dark');

  constructor() {
    effect(() => {
      const locked = this.cartOpen() || this.searchOpen() || this.menuOpen();
      this.doc.body.classList.toggle('is-locked', locked);
    });
  }

  openCart(): void {
    this.searchOpen.set(false);
    this.menuOpen.set(false);
    this.cartOpen.set(true);
  }

  openSearch(): void {
    this.cartOpen.set(false);
    this.menuOpen.set(false);
    this.searchOpen.set(true);
  }

  closeAll(): void {
    this.cartOpen.set(false);
    this.searchOpen.set(false);
    this.menuOpen.set(false);
  }

  flyToBag(from: DOMRect, color: string): void {
    this.fly.set({ from, color, id: Date.now() });
  }
}
