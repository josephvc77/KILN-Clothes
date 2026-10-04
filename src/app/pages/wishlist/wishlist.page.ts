import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { UiStore } from '../../core/services/ui.store';
import { WishlistStore } from '../../core/services/wishlist.store';
import { ProductCardComponent } from '../../components/product-card/product-card.component';

@Component({
  selector: 'k-wishlist-page',
  standalone: true,
  imports: [RouterLink, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-theme': 'bone' },
  template: `
    <div class="container page">
      <p class="t-mono t-muted">Saved on this device</p>
      <h1 class="t-display">Saved <sup class="t-mono accent">{{ items().length }}</sup></h1>
      @if (items().length) {
        <ul class="grid">
          @for (p of items(); track p.id; let i = $index) {
            <li><k-product-card [product]="p" [index]="i" /></li>
          }
        </ul>
      } @else {
        <div class="empty">
          <p class="t-muted">Tap the heart on any piece to keep it here. Each colourway is made in a single run, so don't wait too long.</p>
          <a routerLink="/shop" class="btn">Shop Firing 04</a>
        </div>
      }
    </div>
  `,
  styles: `
    @use 'tokens' as *;
    :host { display: block; background: var(--bg); color: var(--text); min-height: 100vh; }
    .page { padding-top: calc(var(--header-h) + var(--space-9)); padding-bottom: var(--space-10); display: grid; gap: var(--space-5); }
    h1 { font-size: var(--fs-3xl); sup { font-size: var(--fs-sm); vertical-align: super; } }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-7) var(--space-4); margin-top: var(--space-5);
      @include up($bp-md) { grid-template-columns: repeat(3, 1fr); } @include up($bp-lg) { grid-template-columns: repeat(4, 1fr); } }
    .empty { display: grid; justify-items: start; gap: var(--space-5); max-width: 48ch; }
  `,
})
export class WishlistPage implements OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly wishlist = inject(WishlistStore);
  private readonly ui = inject(UiStore);
  protected readonly items = computed(() => this.wishlist.ids().map((id) => this.catalog.byId(id)).filter((p) => !!p));

  constructor() {
    this.ui.headerTone.set('bone');
  }

  ngOnDestroy(): void {
    this.ui.headerTone.set('dark');
  }
}
