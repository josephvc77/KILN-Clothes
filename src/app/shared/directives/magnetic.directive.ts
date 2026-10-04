import { Directive, ElementRef, NgZone, OnDestroy, inject, input } from '@angular/core';

/**
 * Magnetic pull toward the pointer on fine-pointer devices.
 * Transform-only, rAF-throttled, disabled under reduced motion.
 */
@Directive({ selector: '[kMagnetic]', standalone: true })
export class MagneticDirective implements OnDestroy {
  readonly strength = input(0.28, { alias: 'kMagnetic', transform: (v: unknown) => (typeof v === 'number' ? v : 0.28) });

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private raf = 0;
  private tx = 0;
  private ty = 0;
  private cx = 0;
  private cy = 0;
  private readonly enabled =
    matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    if (!this.enabled) return;
    inject(NgZone).runOutsideAngular(() => {
      this.el.addEventListener('pointermove', this.onMove);
      this.el.addEventListener('pointerleave', this.onLeave);
    });
  }

  private onMove = (e: PointerEvent) => {
    const r = this.el.getBoundingClientRect();
    const s = this.strength();
    this.tx = (e.clientX - (r.left + r.width / 2)) * s;
    this.ty = (e.clientY - (r.top + r.height / 2)) * s;
    this.tick();
  };

  private onLeave = () => {
    this.tx = 0;
    this.ty = 0;
    this.tick();
  };

  private tick() {
    if (this.raf) return;
    const step = () => {
      this.cx += (this.tx - this.cx) * 0.2;
      this.cy += (this.ty - this.cy) * 0.2;
      this.el.style.transform = `translate3d(${this.cx.toFixed(2)}px, ${this.cy.toFixed(2)}px, 0)`;
      if (Math.abs(this.tx - this.cx) > 0.1 || Math.abs(this.ty - this.cy) > 0.1) {
        this.raf = requestAnimationFrame(step);
      } else {
        this.raf = 0;
        if (!this.tx && !this.ty) this.el.style.transform = '';
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerleave', this.onLeave);
  }
}
