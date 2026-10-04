import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT } from '../data/catalog';
import { CartLine, GarmentSpec, PrintId, Product, Size } from '../models/product';
import { CatalogService } from './catalog.service';
import { readStorage, writeStorage } from '../utilities/storage';

export interface CartLineView extends CartLine {
  product: Product;
  colorName: string;
  spec: GarmentSpec;
  lineTotal: number;
  maxQty: number;
}

export interface AddToCartInput {
  product: Product;
  colorwayId: string;
  size: Size;
  front: PrintId;
  back: PrintId;
  qty?: number;
}

const STORAGE_KEY = 'kiln.cart.v1';
const MAX_PER_LINE = 10;

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly catalog = inject(CatalogService);

  private readonly _lines = signal<CartLine[]>(this.restore());
  /** Monotonic counter the header listens to for the "bump" animation */
  readonly addedTick = signal(0);
  readonly lastAdded = signal<CartLineView | null>(null);

  readonly lines = computed<CartLineView[]>(() =>
    this._lines()
      .map((l) => {
        const product = this.catalog.byId(l.productId);
        if (!product) return null;
        const stock = this.catalog.stockOf(product, l.colorwayId, l.size);
        const colorway = this.catalog.colorway(product, l.colorwayId);
        return {
          ...l,
          product,
          colorName: colorway.name,
          spec: { kind: product.kind, colorway, front: l.front, back: l.back },
          lineTotal: product.price * l.qty,
          maxQty: Math.min(MAX_PER_LINE, stock),
        };
      })
      .filter((l): l is CartLineView => !!l),
  );

  readonly count = computed(() => this._lines().reduce((n, l) => n + l.qty, 0));
  readonly subtotal = computed(() => this.lines().reduce((n, l) => n + l.lineTotal, 0));
  readonly shipping = computed(() => (this.subtotal() === 0 || this.subtotal() >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT));
  readonly total = computed(() => this.subtotal() + this.shipping());
  readonly freeShippingRemaining = computed(() => Math.max(0, FREE_SHIPPING_THRESHOLD - this.subtotal()));
  readonly freeShippingProgress = computed(() => Math.min(1, this.subtotal() / FREE_SHIPPING_THRESHOLD));

  constructor() {
    effect(() => writeStorage(STORAGE_KEY, this._lines()));
  }

  add(input: AddToCartInput): CartLineView | null {
    const { product, colorwayId, size, front, back } = input;
    const qty = input.qty ?? 1;
    const stock = this.catalog.stockOf(product, colorwayId, size);
    if (stock <= 0) return null;

    const key = [product.id, colorwayId, size, front, back].join('|');
    this._lines.update((lines) => {
      const existing = lines.find((l) => l.key === key);
      if (existing) {
        return lines.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + qty, stock, MAX_PER_LINE) } : l));
      }
      return [...lines, { key, productId: product.id, colorwayId, size, front, back, qty: Math.min(qty, stock) }];
    });

    const view = this.lines().find((l) => l.key === key) ?? null;
    this.lastAdded.set(view);
    this.addedTick.update((n) => n + 1);
    return view;
  }

  setQty(key: string, qty: number): void {
    if (qty <= 0) return this.remove(key);
    this._lines.update((lines) => lines.map((l) => (l.key === key ? { ...l, qty: Math.min(qty, MAX_PER_LINE) } : l)));
  }

  remove(key: string): void {
    this._lines.update((lines) => lines.filter((l) => l.key !== key));
  }

  clear(): void {
    this._lines.set([]);
  }

  private restore(): CartLine[] {
    const raw = readStorage<CartLine[]>(STORAGE_KEY, []);
    return Array.isArray(raw) ? raw.filter((l) => l && typeof l.key === 'string' && l.qty > 0) : [];
  }
}
