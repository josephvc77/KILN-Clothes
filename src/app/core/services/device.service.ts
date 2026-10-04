import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type QualityTier = 'high' | 'medium' | 'low';

/**
 * Device capability snapshot. Drives adaptive 3D quality and motion.
 * Tier is decided once on boot and can be lowered at runtime by the
 * render loop if frames are consistently slow.
 */
@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly doc = inject(DOCUMENT);
  private readonly win = this.doc.defaultView!;

  readonly reducedMotion = signal(this.mq('(prefers-reduced-motion: reduce)'));
  readonly coarsePointer = signal(this.mq('(pointer: coarse)'));
  readonly webgl = signal(this.detectWebGL());
  readonly tier = signal<QualityTier>(this.detectTier());
  /** Set when the user (or a runtime fallback) turned 3D off */
  readonly threeDisabled = signal(false);

  constructor() {
    this.watch('(prefers-reduced-motion: reduce)', (v) => this.reducedMotion.set(v));
    this.watch('(pointer: coarse)', (v) => this.coarsePointer.set(v));
    const params = new URLSearchParams(this.win.location.search);
    if (params.has('no3d')) this.threeDisabled.set(true);
  }

  can3D(): boolean {
    return this.webgl() && !this.threeDisabled();
  }

  /** Called by a scene whose frame budget keeps failing */
  downgrade(): void {
    const t = this.tier();
    if (t === 'high') this.tier.set('medium');
    else if (t === 'medium') this.tier.set('low');
  }

  private detectWebGL(): boolean {
    try {
      const c = this.doc.createElement('canvas');
      const gl = c.getContext('webgl2') ?? c.getContext('webgl');
      const ok = !!gl;
      (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
      return ok;
    } catch {
      return false;
    }
  }

  private detectTier(): QualityTier {
    const nav = this.win.navigator as Navigator & { deviceMemory?: number };
    const cores = nav.hardwareConcurrency ?? 4;
    const mem = nav.deviceMemory ?? 8;
    const small = this.win.innerWidth < 900;
    if (mem <= 2 || cores <= 2) return 'low';
    if (small || mem <= 4 || cores <= 4) return 'medium';
    return 'high';
  }

  private mq(q: string): boolean {
    return this.win.matchMedia?.(q).matches ?? false;
  }

  private watch(q: string, fn: (v: boolean) => void): void {
    this.win.matchMedia?.(q).addEventListener?.('change', (e) => fn(e.matches));
  }
}
