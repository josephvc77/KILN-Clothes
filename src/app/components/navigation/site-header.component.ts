import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, viewChild, untracked } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartStore } from '../../core/services/cart.store';
import { UiStore } from '../../core/services/ui.store';
import { WishlistStore } from '../../core/services/wishlist.store';
import { CatalogService } from '../../core/services/catalog.service';
import { GlassSheenDirective } from '../../shared/directives/glass-sheen.directive';
import { GarmentImageComponent } from '../garment-image/garment-image.component';

@Component({
  selector: 'k-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, GlassSheenDirective, GarmentImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  host: {
    '[class.is-scrolled]': 'scrolled()',
    '[class.is-hidden]': 'hidden()',
    '[attr.data-theme]': "ui.headerTone() === 'bone' ? 'bone' : null",
    '(window:scroll)': 'onScroll()',
  },
})
export class SiteHeaderComponent {
  protected readonly cart = inject(CartStore);
  protected readonly ui = inject(UiStore);
  protected readonly wishlist = inject(WishlistStore);
  protected readonly catalog = inject(CatalogService);

  protected readonly scrolled = signal(false);
  protected readonly hidden = signal(false);
  protected readonly bump = signal(false);
  protected readonly megaOpen = signal(false);
  protected readonly flyStyle = signal<Record<string, string> | null>(null);

  private readonly bagBtn = viewChild<ElementRef<HTMLElement>>('bagBtn');
  private lastY = 0;
  private megaTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly featured = this.catalog.products.slice(0, 3);

  constructor() {
    // Bag bump whenever something is added
    effect(() => {
      const tick = this.cart.addedTick();
      if (!tick) return;
      untracked(() => {
        this.hidden.set(false);
        this.bump.set(false);
        requestAnimationFrame(() => this.bump.set(true));
      });
    });

    // Fly-to-bag: a dot of the garment's colour arcs into the bag icon
    effect(() => {
      const req = this.ui.fly();
      if (!req) return;
      untracked(() => this.fly(req.from, req.color));
    });

    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.ui.closeAll();
        this.megaOpen.set(false);
        this.hidden.set(false);
      });
  }

  onScroll() {
    const y = window.scrollY;
    this.scrolled.set(y > 24);
    const goingDown = y > this.lastY + 4;
    const goingUp = y < this.lastY - 4;
    if (goingDown && y > 400 && !this.megaOpen()) this.hidden.set(true);
    else if (goingUp) this.hidden.set(false);
    this.lastY = y;
  }

  openMega() {
    if (this.megaTimer) clearTimeout(this.megaTimer);
    this.megaOpen.set(true);
  }

  closeMega(delay = 180) {
    if (this.megaTimer) clearTimeout(this.megaTimer);
    this.megaTimer = setTimeout(() => this.megaOpen.set(false), delay);
  }

  toggleMenu() {
    this.ui.menuOpen.update((v) => !v);
  }

  private fly(from: DOMRect, color: string) {
    const bag = this.bagBtn()?.nativeElement;
    if (!bag || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const to = bag.getBoundingClientRect();
    const sx = from.left + from.width / 2;
    const sy = from.top + from.height / 2;
    const dx = to.left + to.width / 2 - sx;
    const dy = to.top + to.height / 2 - sy;
    this.flyStyle.set({
      left: `${sx}px`,
      top: `${sy}px`,
      '--dx': `${dx}px`,
      '--dy': `${dy}px`,
      background: color,
    });
    setTimeout(() => this.flyStyle.set(null), 800);
  }
}
