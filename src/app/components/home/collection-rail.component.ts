import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { loadMotion } from '../../motion/gsap';

/**
 * Firing 04 as a campaign rail: pinned horizontal travel on desktop,
 * native swipe with scroll-snap on touch / small screens.
 */
@Component({
  selector: 'k-collection-rail',
  standalone: true,
  imports: [RouterLink, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rail" #section data-theme="bone" aria-labelledby="rail-title">
      <div class="rail__inner" #inner>
        <header class="rail__head">
          <p class="t-mono t-muted">The collection</p>
          <h2 id="rail-title" class="t-display">Firing<br />04</h2>
          <p class="rail__lede t-muted">Six pieces from one run of the kiln. Each colourway is made once and not restocked.</p>
          <p class="t-mono counter" aria-hidden="true">
            <span class="accent">{{ current() }}</span> / {{ total }}
          </p>
          <a routerLink="/shop" class="btn btn--ghost">Shop all pieces</a>
        </header>
        <ul class="rail__track" #track>
          @for (p of products; track p.id; let i = $index) {
            <li class="rail__item" [class.is-tall]="i % 3 === 0">
              <k-product-card [product]="p" [index]="i" [feature]="true" />
            </li>
          }
          <li class="rail__end">
            <a routerLink="/shop" class="end-link">
              <span class="t-mono t-muted">End of firing</span>
              <span class="t-display">Shop<br />the<br />collection →</span>
            </a>
          </li>
        </ul>
      </div>
    </section>
  `,
  styles: `
    @use 'tokens' as *;
    .rail {
      position: relative;
      z-index: 2;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
    }
    .rail__inner {
      display: flex;
      flex-direction: column;
      gap: var(--space-7);
      padding: var(--space-9) 0;
      @include up($bp-md) {
        flex-direction: row;
        align-items: center;
        height: 100vh;
        padding: calc(var(--header-h) + var(--space-5)) 0 var(--space-6);
        gap: 0;
      }
    }
    .rail__head {
      flex: none;
      display: grid;
      gap: var(--space-4);
      align-content: center;
      padding: 0 var(--gutter);
      @include up($bp-md) { width: clamp(300px, 30vw, 440px); }
      h2 { font-size: var(--fs-3xl); }
      .btn { justify-self: start; }
    }
    .rail__lede { max-width: 34ch; }
    .counter { font-size: var(--fs-sm); }
    .rail__track {
      display: flex;
      gap: var(--space-5);
      padding: 0 var(--gutter);
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
      @include up($bp-md) {
        overflow: visible;
        align-items: center;
        gap: var(--space-7);
        will-change: transform;
      }
    }
    .rail__item {
      flex: none;
      width: min(78vw, 340px);
      scroll-snap-align: start;
      @include up($bp-md) {
        width: clamp(260px, 22vw, 360px);
        &.is-tall { width: clamp(320px, 28vw, 460px); }
      }
    }
    .rail__end {
      flex: none;
      display: grid;
      place-items: center;
      width: min(70vw, 360px);
      scroll-snap-align: start;
    }
    .end-link {
      display: grid;
      gap: var(--space-4);
      .t-display { font-size: var(--fs-2xl); transition: color var(--dur-base); }
      &:hover .t-display { color: var(--accent); }
    }
  `,
})
export class CollectionRailComponent implements OnDestroy {
  protected readonly products = inject(CatalogService).products;
  protected readonly total = String(this.products.length).padStart(2, '0');
  protected readonly current = signal('01');

  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private revert: (() => void) | null = null;

  constructor() {
    afterNextRender(async () => {
      const { gsap } = await loadMotion();
      const mm = gsap.matchMedia();
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        const track = this.track().nativeElement;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + track.getBoundingClientRect().left * 0.2);
        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: this.section().nativeElement,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const i = Math.min(this.products.length, Math.floor(self.progress * this.products.length) + 1);
              this.current.set(String(i).padStart(2, '0'));
            },
          },
        });
      });
      this.revert = () => mm.revert();
    });
  }

  ngOnDestroy(): void {
    this.revert?.();
  }
}
