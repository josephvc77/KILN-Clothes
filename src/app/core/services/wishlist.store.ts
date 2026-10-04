import { Injectable, computed, effect, signal } from '@angular/core';
import { readStorage, writeStorage } from '../utilities/storage';

const STORAGE_KEY = 'kiln.wishlist.v1';

@Injectable({ providedIn: 'root' })
export class WishlistStore {
  private readonly _ids = signal<string[]>(readStorage<string[]>(STORAGE_KEY, []));
  readonly ids = this._ids.asReadonly();
  readonly count = computed(() => this._ids().length);

  constructor() {
    effect(() => writeStorage(STORAGE_KEY, this._ids()));
  }

  has(id: string): boolean {
    return this._ids().includes(id);
  }

  toggle(id: string): boolean {
    const next = !this.has(id);
    this._ids.update((ids) => (next ? [...ids, id] : ids.filter((x) => x !== id)));
    return next;
  }
}
