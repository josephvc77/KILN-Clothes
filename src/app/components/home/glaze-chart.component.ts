import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { COLORWAYS } from '../../core/data/colorways';
import { CatalogService } from '../../core/services/catalog.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';

/** Colourways presented as a potter's glaze test board. Each tile filters the shop. */
@Component({
  selector: 'k-glaze-chart',
  standalone: true,
  imports: [RouterLink, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="glaze" data-theme="bone" aria-labelledby="glaze-title">
      <div class="container glaze__grid">
        <header class="glaze__head">
          <p class="t-mono t-muted">Colourways</p>
          <h2 id="glaze-title" class="t-display" kReveal="lines">
            <span class="reveal-mask"><span class="reveal-line">The glaze</span></span>
            <span class="reveal-mask"><span class="reveal-line">board.</span></span>
          </h2>
          <p class="t-muted lede">
            Potters fire test tiles before they commit to a glaze. We use the same method for dye: every colourway here
            went through 14 test runs before it was approved.
          </p>
        </header>
        <ul class="board" kReveal="fade">
          @for (c of tiles(); track c.id; let i = $index) {
            <li>
              <a class="tile" [routerLink]="['/shop']" [queryParams]="{ color: c.id }" [style.--c]="c.swatch" [attr.aria-label]="'Shop ' + c.name + ', ' + c.count + ' pieces'">
                <span class="tile__body" aria-hidden="true"><span class="tile__drip"></span></span>
                <span class="tile__meta">
                  <span class="t-mono t-muted">T—{{ (i + 1).toString().padStart(2, '0') }}</span>
                  <span class="tile__name">{{ c.name }}</span>
                  <span class="t-mono t-muted">{{ c.count }} {{ c.count === 1 ? 'piece' : 'pieces' }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    @use 'tokens' as *;
    .glaze { position: relative; z-index: 2; background: var(--bg); color: var(--text); padding: var(--space-10) 0; }
    .glaze__grid { display: grid; gap: var(--space-8); @include up($bp-lg) { grid-template-columns: 1fr 1.5fr; align-items: start; } }
    .glaze__head { display: grid; gap: var(--space-5); @include up($bp-lg) { position: sticky; top: 20vh; } h2 { font-size: var(--fs-3xl); } }
    .lede { max-width: 40ch; }
    .board { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-5) var(--space-4); @include up($bp-sm) { grid-template-columns: repeat(3, 1fr); } }
    .tile { display: grid; gap: var(--space-4); }
    .tile__body {
      position: relative;
      aspect-ratio: 3 / 4;
      border-radius: 6px 6px 40% 40% / 6px 6px 16% 16%;
      background:
        radial-gradient(120% 60% at 30% 20%, rgba(255, 255, 255, 0.28), transparent 50%),
        linear-gradient(180deg, color-mix(in srgb, var(--c) 88%, white) 0%, var(--c) 45%, color-mix(in srgb, var(--c) 70%, black) 100%);
      box-shadow: inset 0 -18px 24px rgba(0, 0, 0, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.35), 0 18px 30px -18px rgba(40, 20, 10, 0.5);
      overflow: hidden;
      transition: transform var(--dur-slow) var(--ease-out);
    }
    .tile__body::before {
      /* unglazed foot of the tile */
      content: '';
      position: absolute; left: 0; right: 0; bottom: 0; height: 16%;
      background: #cdbca6;
      box-shadow: inset 0 6px 8px rgba(0, 0, 0, 0.15);
    }
    .tile__drip {
      position: absolute; left: 20%; bottom: 13%; width: 18%; height: 12%;
      border-radius: 0 0 50% 50%;
      background: color-mix(in srgb, var(--c) 75%, black);
    }
    .tile__meta { display: grid; gap: 2px; }
    .tile__name { font-family: var(--font-display); font-weight: 800; font-variation-settings: 'wdth' 62; font-size: var(--fs-lg); text-transform: uppercase; line-height: 1; }
    @include hover { .tile:hover .tile__body { transform: translateY(-6px) rotate(-1deg); } .tile:hover .tile__name { color: var(--accent); } }
  `,
})
export class GlazeChartComponent {
  private readonly catalog = inject(CatalogService);
  protected readonly tiles = computed(() =>
    Object.values(COLORWAYS).map((c) => ({
      ...c,
      count: this.catalog.products.filter((p) => p.colorways.some((x) => x.id === c.id)).length,
    })),
  );
}
