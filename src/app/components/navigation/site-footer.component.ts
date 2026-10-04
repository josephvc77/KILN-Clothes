import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'k-site-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
      <div class="container footer__grid">
        <div class="footer__brand">
          <p class="t-display footer__mark" aria-hidden="true">KILN</p>
          <p class="t-mono t-muted">Heavyweight garments · Fired, not made · Lisbon</p>
        </div>
        <nav aria-label="Shop">
          <p class="t-mono t-muted">Shop</p>
          <ul>
            <li><a routerLink="/shop" class="link-line">All pieces</a></li>
            <li><a routerLink="/shop" [queryParams]="{ kind: 'tee' }">Tees</a></li>
            <li><a routerLink="/shop" [queryParams]="{ kind: 'hoodie' }">Hoodies</a></li>
            <li><a routerLink="/wishlist">Saved</a></li>
          </ul>
        </nav>
        <nav aria-label="Help">
          <p class="t-mono t-muted">Help</p>
          <ul>
            <li><span>Free shipping over €150</span></li>
            <li><span>30-day free returns</span></li>
            <li><a href="mailto:studio@kiln.example">studio&#64;kiln.example</a></li>
          </ul>
        </nav>
        <div class="footer__note">
          <p class="t-mono t-muted">Firing 05</p>
          <p>The next firing opens in November. It will be announced to the studio list first.</p>
        </div>
      </div>
      <div class="container footer__base t-mono t-muted">
        <span>© 2026 KILN Studio</span>
        <span>Prototype storefront — orders are not charged</span>
      </div>
    </footer>
  `,
  styles: `
    @use 'tokens' as *;
    .footer {
      position: relative;
      z-index: 2;
      background: var(--soot-950);
      color: var(--bone-100);
      padding: var(--space-9) 0 var(--space-5);
      border-top: 1px solid rgba(237, 230, 218, 0.08);
    }
    .footer__grid {
      display: grid;
      gap: var(--space-7);
      grid-template-columns: 1fr;
      @include up($bp-sm) { grid-template-columns: 1fr 1fr; }
      @include up($bp-lg) { grid-template-columns: 2fr 1fr 1fr 1.4fr; }
    }
    .footer__mark {
      font-size: clamp(5rem, 16vw, 11rem);
      color: var(--bone-100);
      margin-bottom: var(--space-3);
    }
    ul { display: grid; gap: var(--space-2); margin-top: var(--space-4); }
    a:hover { color: var(--ember-400); }
    .footer__note p:last-child { margin-top: var(--space-4); max-width: 34ch; color: var(--ash-300); }
    .footer__base {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-9);
      padding-top: var(--space-5);
      border-top: 1px solid rgba(237, 230, 218, 0.08);
    }
  `,
})
export class SiteFooterComponent {}
