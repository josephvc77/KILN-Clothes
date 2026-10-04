import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Colorway } from '../../core/models/product';

/** Colourway selector styled as glaze test tiles. Radio-group semantics + arrow keys. */
@Component({
  selector: 'k-colorway-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset>
      <legend class="t-mono">
        <span class="t-muted">{{ label() }}</span>
        <span class="current">{{ selectedName() }}</span>
      </legend>
      <div class="tiles" role="radiogroup" [attr.aria-label]="label()" (keydown)="onKey($event)">
        @for (c of colorways(); track c.id; let i = $index) {
          <button
            type="button"
            role="radio"
            class="tile"
            [attr.aria-checked]="c.id === selected()"
            [attr.tabindex]="c.id === selected() ? 0 : -1"
            [attr.aria-label]="c.name + '. ' + c.note"
            [style.--c]="c.swatch"
            (click)="select.emit(c.id)"
          >
            <span class="tile__glaze" aria-hidden="true"></span>
            <span class="tile__name t-mono" aria-hidden="true">{{ c.name }}</span>
          </button>
        }
      </div>
    </fieldset>
  `,
  styles: `
    @use 'tokens' as *;
    fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
    legend { display: flex; gap: var(--space-3); padding: 0; margin-bottom: var(--space-3); }
    .current { color: var(--text); }
    .tiles { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .tile {
      position: relative;
      display: grid;
      justify-items: center;
      gap: 6px;
      padding: 6px 6px 8px;
      border-radius: var(--radius-sm);
      transition: background-color var(--dur-base);
    }
    .tile__glaze {
      width: 38px;
      height: 46px;
      border-radius: 3px 3px 12px 12px;
      background: var(--c);
      box-shadow:
        inset 0 -8px 10px rgba(0, 0, 0, 0.28),
        inset 0 2px 0 rgba(255, 255, 255, 0.22),
        0 0 0 1px var(--border);
      transition: transform var(--dur-base) var(--ease-spring);
    }
    .tile__name { font-size: 0.5625rem; color: var(--text-muted); }
    .tile[aria-checked='true'] { background: var(--surface); }
    .tile[aria-checked='true'] .tile__glaze { transform: translateY(-3px); box-shadow: inset 0 -8px 10px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.22), 0 0 0 2px var(--text); }
    .tile[aria-checked='true'] .tile__name { color: var(--text); }
    @include hover { .tile:hover .tile__glaze { transform: translateY(-3px); } }
  `,
})
export class ColorwayPickerComponent {
  readonly colorways = input.required<Colorway[]>();
  readonly selected = input.required<string>();
  readonly label = input('Colourway');
  readonly select = output<string>();

  protected selectedName() {
    return this.colorways().find((c) => c.id === this.selected())?.name ?? '';
  }

  protected onKey(e: KeyboardEvent) {
    const list = this.colorways();
    const i = list.findIndex((c) => c.id === this.selected());
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % list.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + list.length) % list.length;
    if (next < 0) return;
    e.preventDefault();
    this.select.emit(list[next].id);
    const host = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => (host.querySelectorAll<HTMLElement>('[role=radio]')[next])?.focus());
  }
}
