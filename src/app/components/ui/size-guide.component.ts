import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import type { GarmentKind } from '../../core/models/product';

// Garment measurements in cm (flat).
const CHARTS: Record<'jersey' | 'fleece', { rows: string[]; head: string[]; data: number[][] }> = {
  jersey: {
    head: ['Size', 'Chest', 'Length', 'Sleeve'],
    rows: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    data: [
      [52, 66, 21],
      [55, 68, 22],
      [58, 70, 23],
      [61, 72, 24],
      [64, 74, 25],
      [67, 76, 26],
    ],
  },
  fleece: {
    head: ['Size', 'Chest', 'Length', 'Sleeve'],
    rows: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    data: [
      [58, 64, 62],
      [61, 66, 63],
      [64, 68, 64],
      [67, 70, 65],
      [70, 72, 66],
      [73, 74, 67],
    ],
  },
};

/** Native <dialog>: focus trapping, Esc and inert background for free. */
@Component({
  selector: 'k-size-guide',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="guide glass" aria-labelledby="guide-title" (close)="closed.emit()" (click)="onBackdrop($event)">
      <header>
        <h2 id="guide-title" class="t-display">Size guide</h2>
        <button type="button" class="x" (click)="dialog.close()" aria-label="Close size guide">×</button>
      </header>
      <div class="units" role="group" aria-label="Units">
        <button type="button" [attr.aria-pressed]="unit() === 'cm'" (click)="unit.set('cm')">cm</button>
        <button type="button" [attr.aria-pressed]="unit() === 'in'" (click)="unit.set('in')">in</button>
      </div>
      <table>
        <caption class="t-mono t-muted">Garment measured flat. Chest is pit to pit.</caption>
        <thead>
          <tr>
            @for (h of chart().head; track h) {
              <th scope="col" class="t-mono">{{ h }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (r of chart().rows; track r; let i = $index) {
            <tr>
              <th scope="row" class="t-mono">{{ r }}</th>
              @for (v of chart().data[i]; track $index) {
                <td>{{ fmt(v) }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
      <p class="t-muted note">
        Between sizes? Our cuts run generous, so size down for a closer fit. Exchanges are free for 30 days.
      </p>
    </dialog>
  `,
  styles: `
    @use 'tokens' as *;
    .guide {
      width: min(560px, calc(100vw - 32px));
      padding: var(--space-6);
      color: var(--text);
      --glass-bg: var(--bg-raised);
      border-radius: var(--radius-md);
      &::backdrop { background: rgba(10, 9, 8, 0.5); backdrop-filter: blur(4px); }
      &[open] { animation: in 400ms var(--ease-out); }
    }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
    h2 { font-size: var(--fs-xl); }
    .x { width: 40px; height: 40px; font-size: 1.5rem; }
    .units { display: inline-flex; gap: 2px; padding: 3px; border-radius: var(--radius-sm); box-shadow: inset 0 0 0 1px var(--border); margin-bottom: var(--space-4);
      button { height: 30px; padding: 0 var(--space-3); border-radius: var(--radius-xs); font-family: var(--font-mono); font-size: var(--fs-xs); }
      button[aria-pressed='true'] { background: var(--text); color: var(--bg); } }
    table { width: 100%; border-collapse: collapse; }
    caption { caption-side: bottom; text-align: left; padding-top: var(--space-3); }
    th, td { padding: var(--space-3) var(--space-2); text-align: left; border-bottom: 1px solid var(--border); font-weight: 400; }
    td { font-variant-numeric: tabular-nums; }
    thead th { color: var(--text-muted); }
    .note { margin-top: var(--space-4); font-size: var(--fs-sm); }
    @keyframes in { from { opacity: 0; transform: translateY(12px); } }
  `,
})
export class SizeGuideComponent {
  readonly open = input(false);
  readonly kind = input<GarmentKind>('tee');
  readonly closed = output<void>();
  protected readonly unit = signal<'cm' | 'in'>('cm');
  protected readonly chart = computed(() => CHARTS[this.kind() === 'tee' || this.kind() === 'longsleeve' ? 'jersey' : 'fleece']);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const d = this.dialog().nativeElement;
      if (this.open() && !d.open) d.showModal();
      else if (!this.open() && d.open) d.close();
    });
  }

  fmt(cm: number) {
    return this.unit() === 'cm' ? cm : (cm / 2.54).toFixed(1);
  }

  onBackdrop(e: MouseEvent) {
    if (e.target === this.dialog().nativeElement) this.dialog().nativeElement.close();
  }
}
