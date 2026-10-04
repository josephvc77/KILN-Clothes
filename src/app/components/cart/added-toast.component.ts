import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { CartStore, CartLineView } from '../../core/services/cart.store';
import { UiStore } from '../../core/services/ui.store';
import { GarmentImageComponent } from '../garment-image/garment-image.component';
import { PricePipe } from '../../shared/pipes/price.pipe';

/** Unambiguous "added" confirmation. Announced to screen readers via role=status. */
@Component({
  selector: 'k-added-toast',
  standalone: true,
  imports: [GarmentImageComponent, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sr" role="status" aria-live="polite">
      @if (line(); as l) { {{ l.product.name }}, {{ l.colorName }}, size {{ l.size }}, added to bag. }
    </div>
    @if (line(); as l) {
      <div class="toast glass" [class.is-out]="leaving()" (pointerenter)="hold()" (pointerleave)="release()" (focusin)="hold()" (focusout)="release()">
        <div class="img"><k-garment-image [spec]="l.spec" [priority]="4" /></div>
        <div class="body">
          <p class="t-mono ok"><span class="check" aria-hidden="true">✓</span> Added to bag</p>
          <p class="name">{{ l.product.name }}</p>
          <p class="t-mono t-muted">{{ l.colorName }} · {{ l.size }} · {{ l.product.price | price }}</p>
        </div>
        <div class="acts">
          <button type="button" class="btn btn--sm" (click)="view()">View bag</button>
          <button type="button" class="x" aria-label="Dismiss" (click)="dismiss()">×</button>
        </div>
      </div>
    }
  `,
  styles: `
    @use 'tokens' as *;
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .toast {
      position: fixed;
      z-index: var(--z-toast);
      right: var(--space-4);
      top: calc(var(--header-h) + var(--space-6));
      display: grid;
      grid-template-columns: 64px 1fr auto;
      align-items: center;
      gap: var(--space-4);
      width: min(420px, calc(100vw - var(--space-5)));
      padding: var(--space-3);
      color: var(--bone-100);
      --glass-bg: rgba(20, 18, 16, 0.86);
      border-radius: var(--radius-md);
      animation: toast-in 600ms var(--ease-out) both;
      @include down($bp-sm) {
        top: auto;
        right: var(--space-2);
        left: var(--space-2);
        bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
        width: auto;
      }
    }
    .toast.is-out { animation: toast-out 400ms var(--ease-in-out) forwards; }
    .img { aspect-ratio: 4/5; background: var(--soot-800); border-radius: var(--radius-sm); overflow: hidden; }
    .ok { color: var(--ember-400); display: flex; align-items: center; gap: 6px; }
    .check {
      display: inline-grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
      background: var(--ember-500); color: #140b06; font-size: 10px;
      animation: check 500ms var(--ease-spring) 150ms both;
    }
    .name { font-weight: 600; margin: 2px 0; }
    .acts { display: flex; align-items: center; gap: var(--space-1); }
    .x { width: 36px; height: 36px; font-size: 1.3rem; color: var(--ash-300); }
    .x:hover { color: var(--bone-100); }
    @keyframes toast-in { from { opacity: 0; transform: translateY(-12px) scale(0.98); } }
    @keyframes toast-out { to { opacity: 0; transform: translateY(-8px); } }
    @keyframes check { from { transform: scale(0); } }
  `,
})
export class AddedToastComponent {
  private readonly cart = inject(CartStore);
  private readonly ui = inject(UiStore);
  protected readonly line = signal<CartLineView | null>(null);
  protected readonly leaving = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private held = false;

  constructor() {
    effect(() => {
      const tick = this.cart.addedTick();
      if (!tick) return;
      untracked(() => {
        if (this.ui.cartOpen()) return;
        this.leaving.set(false);
        this.line.set(this.cart.lastAdded());
        this.schedule();
      });
    });
  }

  view() {
    this.dismiss(true);
    this.ui.openCart();
  }

  hold() {
    this.held = true;
    if (this.timer) clearTimeout(this.timer);
  }

  release() {
    this.held = false;
    this.schedule();
  }

  dismiss(immediate = false) {
    if (this.timer) clearTimeout(this.timer);
    if (immediate) {
      this.line.set(null);
      return;
    }
    this.leaving.set(true);
    setTimeout(() => {
      if (this.leaving()) this.line.set(null);
    }, 400);
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    if (this.held) return;
    this.timer = setTimeout(() => this.dismiss(), 4200);
  }
}
