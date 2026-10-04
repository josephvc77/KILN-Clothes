import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'k-not-found-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="t-mono accent">404 — Cracked in the kiln</p>
      <h1 class="t-display">This page didn't survive the firing.</h1>
      <a routerLink="/shop" class="btn">Shop Firing 04</a>
    </div>
  `,
  styles: `
    .page { min-height: 80vh; display: grid; align-content: center; justify-items: start; gap: var(--space-5); padding-top: var(--header-h); }
    h1 { font-size: var(--fs-2xl); max-width: 16ch; }
  `,
})
export class NotFoundPage {}
