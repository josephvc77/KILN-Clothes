import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../core/services/cart.store';
import { OrderResult, OrderService } from '../../core/services/order.service';
import { UiStore } from '../../core/services/ui.store';
import { FREE_SHIPPING_THRESHOLD } from '../../core/data/catalog';
import { PRINT_LABELS } from '../../core/data/colorways';
import { GarmentImageComponent } from '../../components/garment-image/garment-image.component';
import { PricePipe } from '../../shared/pipes/price.pipe';

const EXPRESS = 18;

@Component({
  selector: 'k-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GarmentImageComponent, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.scss',
  host: { 'data-theme': 'bone' },
})
export class CheckoutPage implements OnDestroy {
  protected readonly cart = inject(CartStore);
  private readonly orders = inject(OrderService);
  private readonly ui = inject(UiStore);
  private readonly fb = inject(FormBuilder);
  protected readonly printLabels = PRINT_LABELS;
  protected readonly express = EXPRESS;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    address: ['', Validators.required],
    city: ['', Validators.required],
    postcode: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9 -]{3,10}$/)]],
    country: ['PT', Validators.required],
    method: ['standard' as 'standard' | 'express'],
  });

  private readonly method = toSignal(this.form.controls.method.valueChanges, { initialValue: 'standard' as const });
  protected readonly shippingCost = computed(() => (this.method() === 'express' ? EXPRESS : this.cart.shipping()));
  protected readonly total = computed(() => this.cart.subtotal() + this.shippingCost());
  protected readonly freeThreshold = FREE_SHIPPING_THRESHOLD;

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly order = signal<OrderResult | null>(null);

  protected readonly countries = [
    { code: 'PT', name: 'Portugal' },
    { code: 'ES', name: 'Spain' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'IT', name: 'Italy' },
    { code: 'IE', name: 'Ireland' },
  ];

  constructor() {
    this.ui.headerTone.set('bone');
  }

  invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  async submit() {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const first = document.querySelector<HTMLElement>('.checkout form .ng-invalid:not(form)');
      first?.focus();
      return;
    }
    this.submitting.set(true);
    const shipping = this.form.getRawValue();
    const result = await this.orders.createOrder({
      lines: this.cart.lines(),
      shipping,
      subtotal: this.cart.subtotal(),
      shippingCost: this.shippingCost(),
      total: this.total(),
    });
    this.submitting.set(false);
    if (result.paymentUrl) {
      window.location.assign(result.paymentUrl);
      return;
    }
    this.order.set(result);
    this.cart.clear();
    window.scrollTo({ top: 0 });
  }

  ngOnDestroy(): void {
    this.ui.headerTone.set('dark');
  }
}
