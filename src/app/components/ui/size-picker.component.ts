import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { Size } from '../../core/models/product';
import type { StockState } from '../../core/services/catalog.service';

export interface SizeOption {
  size: Size;
  qty: number;
  state: StockState;
}

@Component({
  selector: 'k-size-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset [class.is-error]="error()">
      <legend class="t-mono">
        <span class="t-muted">Size</span>
        @if (selectedOption(); as s) {
          <span class="state" [attr.data-state]="s.state">
            {{ s.state === 'low' ? 'Only ' + s.qty + ' left' : 'In stock' }}
          </span>
        } @else if (error()) {
          <span class="err" role="alert">Choose a size first</span>
        }
        <ng-content select="[slot=aside]" />
      </legend>
      <div class="grid" role="radiogroup" aria-label="Size" (keydown)="onKey($event)">
        @for (o of options(); track o.size; let i = $index) {
          <button
            type="button"
            role="radio"
            class="opt t-mono"
            [attr.aria-checked]="o.size === selected()"
            [attr.tabindex]="o.size === selected() || (!selected() && i === firstAvailable()) ? 0 : -1"
            [attr.aria-disabled]="o.state === 'out'"
            [attr.data-state]="o.state"
            [attr.aria-label]="o.size + (o.state === 'out' ? ', sold out' : o.state === 'low' ? ', only ' + o.qty + ' left' : '')"
            (click)="o.state !== 'out' && select.emit(o.size)"
          >
            {{ o.size }}
          </button>
        }
      </div>
    </fieldset>
  `,
  styles: `
    @use 'tokens' as *;
    fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
    legend { display: flex; align-items: baseline; gap: var(--space-3); width: 100%; padding: 0; margin-bottom: var(--space-3); }
    .state[data-state='low'] { color: var(--state-low-stock); }
    .state[data-state='in'] { color: var(--state-in-stock); }
    .err { color: var(--danger); }
    .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
    .opt {
      position: relative;
      height: 48px;
      border-radius: var(--radius-sm);
      box-shadow: inset 0 0 0 1px var(--border-strong);
      font-size: var(--fs-xs);
      transition: background-color var(--dur-fast), color var(--dur-fast), box-shadow var(--dur-fast);
    }
    @include hover { .opt:hover:not([aria-disabled='true']) { box-shadow: inset 0 0 0 1px var(--text); } }
    .opt[aria-checked='true'] { background: var(--text); color: var(--bg); box-shadow: none; }
    .opt[data-state='low']::after {
      content: ''; position: absolute; top: 7px; right: 7px; width: 5px; height: 5px; border-radius: 50%;
      background: var(--state-low-stock);
    }
    .opt[aria-disabled='true'] {
      color: var(--text-faint);
      cursor: not-allowed;
      background: repeating-linear-gradient(135deg, transparent 0 6px, var(--border) 6px 7px);
    }
    .is-error .opt:not([aria-disabled='true']) { box-shadow: inset 0 0 0 1px var(--danger); }
    ::ng-deep [slot='aside'] { margin-left: auto; }
  `,
})
export class SizePickerComponent {
  readonly options = input.required<SizeOption[]>();
  readonly selected = input<Size | null>(null);
  readonly error = input(false);
  readonly select = output<Size>();

  protected readonly selectedOption = computed(() => this.options().find((o) => o.size === this.selected()) ?? null);
  protected readonly firstAvailable = computed(() => Math.max(0, this.options().findIndex((o) => o.state !== 'out')));

  protected onKey(e: KeyboardEvent) {
    const opts = this.options();
    const avail = opts.map((o, i) => (o.state !== 'out' ? i : -1)).filter((i) => i >= 0);
    if (!avail.length) return;
    const cur = opts.findIndex((o) => o.size === this.selected());
    const pos = Math.max(0, avail.indexOf(cur));
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = avail[(pos + (cur < 0 ? 0 : 1)) % avail.length];
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = avail[(pos - 1 + avail.length) % avail.length];
    if (next < 0) return;
    e.preventDefault();
    this.select.emit(opts[next].size);
    const host = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => host.querySelectorAll<HTMLElement>('[role=radio]')[next]?.focus());
  }
}
