const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Minimal focus trap for dialogs/drawers: Tab cycles inside, Esc closes, focus is restored. */
export class FocusTrap {
  private el: HTMLElement | null = null;
  private restoreTo: HTMLElement | null = null;
  private onEscape: (() => void) | null = null;

  activate(el: HTMLElement, onEscape: () => void, initial?: HTMLElement | null): void {
    this.el = el;
    this.onEscape = onEscape;
    this.restoreTo = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', this.onKey, true);
    requestAnimationFrame(() => (initial ?? this.focusables()[0] ?? el).focus({ preventScroll: true }));
  }

  deactivate(): void {
    if (!this.el) return;
    document.removeEventListener('keydown', this.onKey, true);
    this.el = null;
    this.restoreTo?.focus?.({ preventScroll: true });
    this.restoreTo = null;
  }

  private focusables(): HTMLElement[] {
    return this.el ? Array.from(this.el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null) : [];
  }

  private onKey = (e: KeyboardEvent) => {
    if (!this.el) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.onEscape?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = this.focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
}
