import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import type { GarmentSpec, PrintId, Size } from '../../core/models/product';
import { PRINT_LABELS } from '../../core/data/colorways';
import { CatalogService } from '../../core/services/catalog.service';
import { CartStore } from '../../core/services/cart.store';
import { UiStore } from '../../core/services/ui.store';
import { WishlistStore } from '../../core/services/wishlist.store';
import { ProductViewerComponent } from '../../components/product-viewer/product-viewer.component';
import { ColorwayPickerComponent } from '../../components/ui/colorway-picker.component';
import { SizePickerComponent, SizeOption } from '../../components/ui/size-picker.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { GarmentImageComponent } from '../../components/garment-image/garment-image.component';
import { SizeGuideComponent } from '../../components/ui/size-guide.component';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'k-product-page',
  standalone: true,
  imports: [
    RouterLink,
    ProductViewerComponent,
    ColorwayPickerComponent,
    SizePickerComponent,
    ProductCardComponent,
    GarmentImageComponent,
    SizeGuideComponent,
    PricePipe,
    MagneticDirective,
    RevealDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product.page.html',
  styleUrl: './product.page.scss',
  host: { 'data-theme': 'bone' },
})
export class ProductPage implements OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartStore);
  private readonly ui = inject(UiStore);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  protected readonly wishlist = inject(WishlistStore);

  readonly slug = input.required<string>();
  /** colourway via ?c= */
  readonly c = input<string | undefined>();

  protected readonly product = computed(() => this.catalog.bySlug(this.slug()));
  protected readonly colorId = signal<string>('');
  protected readonly size = signal<Size | null>(null);
  protected readonly front = signal<PrintId>('none');
  protected readonly back = signal<PrintId>('none');
  protected readonly sizeError = signal(false);
  protected readonly added = signal(false);
  protected readonly guideOpen = signal(false);
  protected readonly showBar = signal(false);
  protected readonly printLabels = PRINT_LABELS;

  protected readonly colorway = computed(() => {
    const p = this.product();
    return p ? this.catalog.colorway(p, this.colorId()) : null;
  });

  protected readonly spec = computed<GarmentSpec | null>(() => {
    const p = this.product();
    const c = this.colorway();
    return p && c ? { kind: p.kind, colorway: c, front: this.front(), back: this.back() } : null;
  });

  protected readonly sizeOptions = computed<SizeOption[]>(() => {
    const p = this.product();
    const c = this.colorway();
    if (!p || !c) return [];
    return p.sizes.map((size) => {
      const qty = this.catalog.stockOf(p, c.id, size);
      return { size, qty, state: this.catalog.stockState(qty) };
    });
  });

  protected readonly soldOut = computed(() => this.sizeOptions().every((o) => o.state === 'out'));
  protected readonly rating = computed(() => {
    const r = this.product()?.reviews ?? [];
    return r.length ? r.reduce((n, x) => n + x.rating, 0) / r.length : 0;
  });
  protected readonly fitSummary = computed(() => {
    const r = this.product()?.reviews ?? [];
    const tts = r.filter((x) => x.fit === 'True to size').length;
    return r.length ? Math.round((tts / r.length) * 100) : 0;
  });
  protected readonly related = computed(() => {
    const p = this.product();
    return p ? this.catalog.related(p, 4) : [];
  });
  protected readonly saved = computed(() => !!this.product() && this.wishlist.ids().includes(this.product()!.id));

  private readonly buyBlock = viewChild<ElementRef<HTMLElement>>('buyBlock');
  private io: IntersectionObserver | null = null;

  constructor() {
    // Reset selection whenever the product changes
    effect(() => {
      const p = this.product();
      const c = this.c();
      untracked(() => {
        if (!p) {
          this.title.setTitle('Not found — KILN');
          return;
        }
        this.title.setTitle(`${p.name} — ${p.gsm}gsm — KILN`);
        this.colorId.set(this.catalog.colorway(p, c).id);
        this.front.set(p.defaultFront);
        this.back.set(p.defaultBack);
        this.size.set(null);
        this.sizeError.set(false);
      });
    });

    this.ui.headerTone.set('bone');

    afterNextRender(() => {
      this.io = new IntersectionObserver(([e]) => this.showBar.set(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
      const el = this.buyBlock()?.nativeElement;
      if (el) this.io.observe(el);
    });
  }

  selectColor(id: string) {
    this.colorId.set(id);
    const s = this.size();
    const p = this.product();
    if (s && p && this.catalog.stockOf(p, id, s) <= 0) this.size.set(null);
    // Keep the URL shareable without adding history entries
    this.router.navigate([], { queryParams: { c: id }, replaceUrl: true, queryParamsHandling: 'merge' });
  }

  selectSize(s: Size) {
    this.size.set(s);
    this.sizeError.set(false);
  }

  addToBag(ev: Event | null, thenCheckout = false): boolean {
    const p = this.product();
    const s = this.size();
    if (!p) return false;
    if (!s) {
      this.sizeError.set(true);
      document.getElementById('size-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    const line = this.cart.add({ product: p, colorwayId: this.colorId(), size: s, front: this.front(), back: this.back() });
    if (!line) return false;
    if (ev && !thenCheckout) {
      this.ui.flyToBag((ev.currentTarget as HTMLElement).getBoundingClientRect(), this.colorway()!.swatch);
    }
    this.added.set(true);
    setTimeout(() => this.added.set(false), 1800);
    if (thenCheckout) this.router.navigateByUrl('/checkout');
    return true;
  }

  toggleSave() {
    const p = this.product();
    if (p) this.wishlist.toggle(p.id);
  }

  stars(n: number) {
    return '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.ui.headerTone.set('dark');
  }
}
