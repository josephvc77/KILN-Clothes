import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartStore } from '../../core/services/cart.store';
import { UiStore } from '../../core/services/ui.store';
import { PRINT_LABELS } from '../../core/data/colorways';
import { GarmentImageComponent } from '../garment-image/garment-image.component';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { FocusTrap } from '../../shared/utilities/focus-trap';

@Component({
  selector: 'k-cart-drawer',
  standalone: true,
  imports: [RouterLink, GarmentImageComponent, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
})
export class CartDrawerComponent {
  protected readonly cart = inject(CartStore);
  protected readonly ui = inject(UiStore);
  private readonly router = inject(Router);
  protected readonly printLabels = PRINT_LABELS;

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly trap = new FocusTrap();

  constructor() {
    effect(() => {
      const open = this.ui.cartOpen();
      const el = this.panel().nativeElement;
      if (open) this.trap.activate(el, () => this.ui.cartOpen.set(false));
      else this.trap.deactivate();
    });
  }

  checkout() {
    this.ui.cartOpen.set(false);
    this.router.navigateByUrl('/checkout');
  }
}
