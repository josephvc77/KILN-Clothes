import { Injectable } from '@angular/core';
import type { CartLineView } from './cart.store';

export interface ShippingDetails {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  method: 'standard' | 'express';
}

export interface OrderDraft {
  lines: CartLineView[];
  shipping: ShippingDetails;
  subtotal: number;
  shippingCost: number;
  total: number;
}

export interface OrderResult {
  id: string;
  /** In production: the provider-hosted payment URL (e.g. Stripe Checkout session.url) */
  paymentUrl: string | null;
  draft: OrderDraft;
}

/**
 * Integration seam for the commerce backend.
 *
 * Production: POST the draft to your API, which creates the order and a
 * payment session (Stripe Checkout / Adyen / Shopify checkout) and returns
 * its redirect URL. Card data never touches this frontend.
 *
 * Prototype: resolves locally with a reference and no payment URL.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  async createOrder(draft: OrderDraft): Promise<OrderResult> {
    await new Promise((r) => setTimeout(r, 900));
    const id = `K04-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    return { id, paymentUrl: null, draft };
  }
}
