import { Directive, ElementRef, OnDestroy, afterNextRender, inject, input } from '@angular/core';
import { loadMotion } from '../../motion/gsap';

/**
 * Scroll reveal. `kReveal="lines"` rises each `.reveal-line` out of its
 * mask; `"fade"` lifts children with a stagger; `"image"` wipes up with
 * clip-path. Content is visible by default — JS only adds motion.
 */
@Directive({ selector: '[kReveal]', standalone: true })
export class RevealDirective implements OnDestroy {
  readonly mode = input<'lines' | 'fade' | 'image' | ''>('fade', { alias: 'kReveal' });
  readonly delay = input(0, { alias: 'kRevealDelay' });

  private readonly el = inject(ElementRef).nativeElement as HTMLElement;
  private cleanup: (() => void) | null = null;

  constructor() {
    afterNextRender(async () => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const { gsap, ScrollTrigger } = await loadMotion();
      const mode = this.mode() || 'fade';
      const targets =
        mode === 'lines'
          ? this.el.querySelectorAll('.reveal-line')
          : mode === 'image'
            ? [this.el]
            : Array.from(this.el.children);
      if (!targets.length) return;

      const from =
        mode === 'lines'
          ? { yPercent: 110 }
          : mode === 'image'
            ? { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08 }
            : { y: 28, opacity: 0 };
      const to =
        mode === 'lines'
          ? { yPercent: 0, stagger: 0.08, duration: 1.2 }
          : mode === 'image'
            ? { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.4, ease: 'expo.inOut' }
            : { y: 0, opacity: 1, stagger: 0.07, duration: 1 };

      // Only animate what is below the fold; above-fold content just shows.
      const rect = this.el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85) {
        if (mode === 'lines') gsap.fromTo(targets, from, { ...to, delay: 0.15 + this.delay() });
        return;
      }
      gsap.set(targets, from);
      const st = ScrollTrigger.create({
        trigger: this.el,
        start: 'top 85%',
        once: true,
        onEnter: () => gsap.to(targets, { ...to, delay: this.delay() }),
      });
      this.cleanup = () => st.kill();
    });
  }

  ngOnDestroy(): void {
    this.cleanup?.();
  }
}
