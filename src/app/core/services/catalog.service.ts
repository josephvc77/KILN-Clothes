import { Injectable } from '@angular/core';
import { CATALOG } from '../data/catalog';
import { Colorway, Product, Size } from '../models/product';

export type StockState = 'in' | 'low' | 'out';

/**
 * Read-only product source. Swap the body for an HTTP/Shopify/Medusa
 * client later — consumers only depend on these method signatures.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  readonly products: readonly Product[] = CATALOG;

  bySlug(slug: string): Product | undefined {
    return this.products.find((p) => p.slug === slug);
  }

  byId(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  colorway(product: Product, id: string | null | undefined): Colorway {
    return product.colorways.find((c) => c.id === id) ?? product.colorways[0];
  }

  stockOf(product: Product, colorwayId: string, size: Size): number {
    return product.stock[colorwayId]?.[size] ?? 0;
  }

  stockState(qty: number): StockState {
    return qty <= 0 ? 'out' : qty <= 6 ? 'low' : 'in';
  }

  /** Sizes available in at least one colorway */
  availableSizes(product: Product, colorwayId: string): Size[] {
    return product.sizes.filter((s) => this.stockOf(product, colorwayId, s) > 0);
  }

  related(product: Product, limit = 3): Product[] {
    return this.products
      .filter((p) => p.id !== product.id)
      .sort((a, b) => Number(b.kind === product.kind) - Number(a.kind === product.kind))
      .slice(0, limit);
  }

  search(query: string): Product[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/);
    return this.products
      .map((p) => {
        const hay = [p.name, p.kind, p.tagline, p.cone, `${p.gsm}gsm`, ...p.colorways.map((c) => c.name)]
          .join(' ')
          .toLowerCase();
        const score = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0) + (p.name.toLowerCase().startsWith(t) ? 1 : 0), 0);
        return { p, score };
      })
      .filter((r) => r.score >= terms.length)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.p);
  }
}
