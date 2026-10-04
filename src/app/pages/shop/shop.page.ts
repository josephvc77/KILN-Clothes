import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { COLORWAYS } from '../../core/data/colorways';
import type { GarmentKind, Size } from '../../core/models/product';
import { CatalogService } from '../../core/services/catalog.service';
import { UiStore } from '../../core/services/ui.store';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'weight';

const KINDS: { id: GarmentKind | null; label: string }[] = [
  { id: null, label: 'All' },
  { id: 'tee', label: 'Tees' },
  { id: 'longsleeve', label: 'Longsleeves' },
  { id: 'crew', label: 'Crews' },
  { id: 'hoodie', label: 'Hoodies' },
];
const SIZES: Size[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

@Component({
  selector: 'k-shop-page',
  standalone: true,
  imports: [RouterLink, ProductCardComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shop.page.html',
  styleUrl: './shop.page.scss',
  host: { 'data-theme': 'bone' },
})
export class ShopPage implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiStore);

  // Bound from query params (withComponentInputBinding)
  readonly kind = input<string | undefined>();
  readonly color = input<string | undefined>();
  readonly size = input<string | undefined>();
  readonly sort = input<string | undefined>();

  protected readonly kinds = KINDS;
  protected readonly sizes = SIZES;
  protected readonly colorways = Object.values(COLORWAYS);
  protected readonly sorts: { id: Sort; label: string }[] = [
    { id: 'featured', label: 'Featured' },
    { id: 'price-asc', label: 'Price, low to high' },
    { id: 'price-desc', label: 'Price, high to low' },
    { id: 'weight', label: 'Heaviest first' },
  ];

  protected readonly activeSort = computed<Sort>(() => (this.sorts.some((s) => s.id === this.sort()) ? (this.sort() as Sort) : 'featured'));
  protected readonly activeColorName = computed(() => this.colorways.find((c) => c.id === this.color())?.name ?? null);

  protected readonly results = computed(() => {
    const kind = this.kind();
    const color = this.color();
    const size = this.size() as Size | undefined;
    let list = this.catalog.products.filter((p) => {
      if (kind && p.kind !== kind) return false;
      if (color && !p.colorways.some((c) => c.id === color)) return false;
      if (size) {
        const ids = color ? [color] : p.colorways.map((c) => c.id);
        if (!ids.some((id) => this.catalog.stockOf(p, id, size) > 0)) return false;
      }
      return true;
    });
    switch (this.activeSort()) {
      case 'price-asc':
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case 'weight':
        list = [...list].sort((a, b) => b.gsm - a.gsm);
        break;
    }
    return list;
  });

  protected readonly hasFilters = computed(() => !!(this.kind() || this.color() || this.size()));

  ngOnInit(): void {
    this.ui.headerTone.set('bone');
  }

  ngOnDestroy(): void {
    this.ui.headerTone.set('dark');
  }

  setParam(key: 'kind' | 'color' | 'size' | 'sort', value: string | null) {
    this.router.navigate([], { queryParams: { [key]: value || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  toggleParam(key: 'color' | 'size', value: string) {
    const current = key === 'color' ? this.color() : this.size();
    this.setParam(key, current === value ? null : value);
  }

  clear() {
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  /** Editorial rhythm: every 5th card spans wide */
  isFeature(i: number) {
    return i % 5 === 0;
  }
}
