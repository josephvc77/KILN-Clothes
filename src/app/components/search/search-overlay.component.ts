import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { UiStore } from '../../core/services/ui.store';
import { COLORWAYS } from '../../core/data/colorways';
import { GarmentImageComponent } from '../garment-image/garment-image.component';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { FocusTrap } from '../../shared/utilities/focus-trap';
import { readStorage, writeStorage } from '../../core/utilities/storage';

const RECENT_KEY = 'kiln.recent-search.v1';

@Component({
  selector: 'k-search-overlay',
  standalone: true,
  imports: [RouterLink, GarmentImageComponent, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-overlay.component.html',
  styleUrl: './search-overlay.component.scss',
})
export class SearchOverlayComponent {
  protected readonly ui = inject(UiStore);
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);

  protected readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly recent = signal<string[]>(readStorage<string[]>(RECENT_KEY, []));
  protected readonly results = computed(() => this.catalog.search(this.query()));
  protected readonly suggestions = ['hoodie', '480gsm', 'celadon', 'tee', 'clay'];
  protected readonly colorways = Object.values(COLORWAYS);
  protected readonly featured = this.catalog.products.slice(0, 4);

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly trap = new FocusTrap();

  constructor() {
    effect(() => {
      if (this.ui.searchOpen()) {
        this.trap.activate(this.panel().nativeElement, () => this.ui.searchOpen.set(false), this.input().nativeElement);
      } else {
        this.trap.deactivate();
      }
    });
  }

  onInput(v: string) {
    this.query.set(v);
    this.active.set(0);
  }

  onKey(e: KeyboardEvent) {
    const n = this.results().length;
    if (!n) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.active.update((i) => (i + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.active.update((i) => (i - 1 + n) % n);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.go(this.results()[this.active()].slug);
    }
  }

  use(term: string) {
    this.query.set(term);
    this.input().nativeElement.focus();
  }

  go(slug: string, color?: string) {
    this.remember();
    this.ui.searchOpen.set(false);
    this.router.navigate(['/product', slug], { queryParams: color ? { c: color } : {} });
  }

  shopColor(id: string) {
    this.ui.searchOpen.set(false);
    this.router.navigate(['/shop'], { queryParams: { color: id } });
  }

  clearRecent() {
    this.recent.set([]);
    writeStorage(RECENT_KEY, []);
  }

  private remember() {
    const q = this.query().trim();
    if (!q) return;
    const next = [q, ...this.recent().filter((r) => r !== q)].slice(0, 5);
    this.recent.set(next);
    writeStorage(RECENT_KEY, next);
  }
}
