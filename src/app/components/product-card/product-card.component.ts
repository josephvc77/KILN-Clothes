import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { GarmentSpec, Product, Size } from '../../core/models/product';
import { CatalogService } from '../../core/services/catalog.service';
import { CartStore } from '../../core/services/cart.store';
import { WishlistStore } from '../../core/services/wishlist.store';
import { UiStore } from '../../core/services/ui.store';
import { GarmentImageComponent } from '../garment-image/garment-image.component';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'k-product-card',
  standalone: true,
  imports: [RouterLink, GarmentImageComponent, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  host: { '[class.is-feature]': 'feature()' },
})
export class ProductCardComponent {
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartStore);
  private readonly ui = inject(UiStore);
  protected readonly wishlist = inject(WishlistStore);

  readonly product = input.required<Product>();
  readonly index = input(0);
  readonly feature = input(false);
  readonly initialColor = input<string | null>(null);

  private readonly pickedColor = signal<string | null>(null);
  protected readonly hovering = signal(false);
  protected readonly quickOpen = signal(false);
  protected readonly added = signal<Size | null>(null);

  protected readonly colorway = computed(() =>
    this.catalog.colorway(this.product(), this.pickedColor() ?? this.initialColor()),
  );
  protected readonly spec = computed<GarmentSpec>(() => ({
    kind: this.product().kind,
    colorway: this.colorway(),
    front: this.product().defaultFront,
    back: this.product().defaultBack,
  }));
  protected readonly hasBackPrint = computed(() => this.product().defaultBack !== 'none');
  protected readonly sizes = computed(() =>
    this.product().sizes.map((s) => {
      const qty = this.catalog.stockOf(this.product(), this.colorway().id, s);
      return { size: s, qty, state: this.catalog.stockState(qty) };
    }),
  );
  protected readonly lowStock = computed(() => {
    const low = this.sizes().filter((s) => s.state === 'low');
    return low.length ? `Low in ${low.map((s) => s.size).join(', ')}` : null;
  });
  protected readonly saved = computed(() => this.wishlist.ids().includes(this.product().id));
  protected readonly number = computed(() => String(this.index() + 1).padStart(2, '0'));

  pickColor(id: string) {
    this.pickedColor.set(id);
  }

  toggleSave() {
    this.wishlist.toggle(this.product().id);
  }

  quickAdd(size: Size, ev: Event) {
    const p = this.product();
    const line = this.cart.add({ product: p, colorwayId: this.colorway().id, size, front: p.defaultFront, back: p.defaultBack });
    if (!line) return;
    this.added.set(size);
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.ui.flyToBag(rect, this.colorway().swatch);
    setTimeout(() => {
      this.added.set(null);
      this.quickOpen.set(false);
    }, 1400);
  }
}
