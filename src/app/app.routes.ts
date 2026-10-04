import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage), title: 'KILN — Heavyweight garments. Fired, not made.' },
  { path: 'shop', loadComponent: () => import('./pages/shop/shop.page').then((m) => m.ShopPage), title: 'Shop Firing 04 — KILN' },
  { path: 'product/:slug', loadComponent: () => import('./pages/product/product.page').then((m) => m.ProductPage) },
  { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout.page').then((m) => m.CheckoutPage), title: 'Checkout — KILN' },
  { path: 'wishlist', loadComponent: () => import('./pages/wishlist/wishlist.page').then((m) => m.WishlistPage), title: 'Saved — KILN' },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage), title: 'Not found — KILN' },
];
