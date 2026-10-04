import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from './components/navigation/site-header.component';
import { CartDrawerComponent } from './components/cart/cart-drawer.component';
import { SearchOverlayComponent } from './components/search/search-overlay.component';
import { AddedToastComponent } from './components/cart/added-toast.component';
import { SiteFooterComponent } from './components/navigation/site-footer.component';
import { UiStore } from './core/services/ui.store';

@Component({
  selector: 'k-root',
  standalone: true,
  imports: [RouterOutlet, SiteHeaderComponent, CartDrawerComponent, SearchOverlayComponent, AddedToastComponent, SiteFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <k-site-header />
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
    <k-site-footer />
    <k-cart-drawer />
    <k-search-overlay />
    <k-added-toast />
  `,
  styles: `
    main {
      display: block;
      min-height: 100dvh;
      outline: none;
    }
  `,
})
export class AppComponent {
  private readonly ui = inject(UiStore);

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const typing = target.closest('input, textarea, select, [contenteditable]');
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      this.ui.openSearch();
    }
  }
}
