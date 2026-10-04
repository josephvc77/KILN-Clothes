import { Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/** Moves the glass surface highlight with the pointer (fine pointers only). */
@Directive({ selector: '[kGlassSheen]', standalone: true })
export class GlassSheenDirective implements OnDestroy {
  private readonly el = inject(ElementRef).nativeElement as HTMLElement;
  private raf = 0;
  private readonly enabled = matchMedia('(hover: hover) and (pointer: fine)').matches;

  constructor() {
    if (!this.enabled) return;
    this.el.addEventListener('pointermove', this.move);
    this.el.addEventListener('pointerleave', this.leave);
  }

  private move = (e: PointerEvent) => {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      const r = this.el.getBoundingClientRect();
      this.el.style.setProperty('--gx', `${e.clientX - r.left}px`);
      this.el.style.setProperty('--gy', `${e.clientY - r.top}px`);
      this.el.classList.add('is-sheen');
    });
  };

  private leave = () => this.el.classList.remove('is-sheen');

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.el.removeEventListener('pointermove', this.move);
    this.el.removeEventListener('pointerleave', this.leave);
  }
}
