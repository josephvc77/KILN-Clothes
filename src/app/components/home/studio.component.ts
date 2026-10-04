import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';

@Component({
  selector: 'k-studio',
  standalone: true,
  imports: [RouterLink, RevealDirective, MagneticDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="studio" class="studio" aria-labelledby="studio-title">
      <div class="container">
        <p class="t-mono t-muted">Studio — Lisbon</p>
        <h2 id="studio-title" class="studio__title t-display" kReveal="lines">
          <span class="reveal-mask"><span class="reveal-line">We make clothes</span></span>
          <span class="reveal-mask"><span class="reveal-line">the way potters</span></span>
          <span class="reveal-mask"><span class="reveal-line accent">make bowls.</span></span>
        </h2>

        <ol class="facts" kReveal="fade">
          <li>
            <span class="facts__n t-display">1260°</span>
            <span class="t-mono t-muted">Cone 10</span>
            <p>The highest standard firing, and the temperature on our back-print chart.</p>
          </li>
          <li>
            <span class="facts__n t-display">480</span>
            <span class="t-mono t-muted">Grams per m²</span>
            <p>Our heaviest loopback. It holds its shape because the fabric is dense, not because it's stiffened.</p>
          </li>
          <li>
            <span class="facts__n t-display">1×</span>
            <span class="t-mono t-muted">Run per colour</span>
            <p>Each colourway is dyed once. When it sells out, it's gone.</p>
          </li>
          <li>
            <span class="facts__n t-display">0</span>
            <span class="t-mono t-muted">Shrinkage</span>
            <p>Garment-dyed and tumbled at heat before it leaves the studio.</p>
          </li>
        </ol>

        <div class="cta">
          <p class="t-mono t-muted">Free shipping over €150 · 30-day returns</p>
          <a routerLink="/shop" class="btn" kMagnetic>Shop the collection <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
  `,
  styles: `
    @use 'tokens' as *;
    .studio {
      position: relative;
      z-index: 2;
      padding: var(--space-10) 0 var(--space-9);
      background:
        radial-gradient(70% 50% at 80% 100%, rgba(255, 90, 31, 0.16), transparent 70%),
        var(--soot-900);
      color: var(--bone-100);
    }
    .studio__title { font-size: var(--fs-3xl); margin: var(--space-5) 0 var(--space-9); max-width: 14ch; }
    .facts {
      display: grid;
      gap: var(--space-7) var(--space-5);
      grid-template-columns: 1fr;
      @include up($bp-sm) { grid-template-columns: 1fr 1fr; }
      @include up($bp-lg) { grid-template-columns: repeat(4, 1fr); }
      li { display: grid; gap: var(--space-2); align-content: start; padding-top: var(--space-4); border-top: 1px solid rgba(237,230,218,0.14); }
      p { color: var(--ash-300); max-width: 30ch; margin-top: var(--space-2); }
    }
    .facts__n { font-size: var(--fs-2xl); color: var(--bone-100); }
    .cta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-5); margin-top: var(--space-9); padding-top: var(--space-6); border-top: 1px solid rgba(237,230,218,0.14); }
  `,
})
export class StudioComponent {}
