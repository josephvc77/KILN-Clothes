import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { GarmentSpec, Hotspot } from '../../core/models/product';
import { DeviceService } from '../../core/services/device.service';
import type { ProjectedHotspot, ViewerScene } from '../../three/scenes/viewer-scene';
import { GarmentImageComponent } from '../garment-image/garment-image.component';
import { GlassSheenDirective } from '../../shared/directives/glass-sheen.directive';

@Component({
  selector: 'k-product-viewer',
  standalone: true,
  imports: [GarmentImageComponent, GlassSheenDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-viewer.component.html',
  styleUrl: './product-viewer.component.scss',
  host: { '[class.is-fullscreen]': 'fullscreen()' },
})
export class ProductViewerComponent implements OnDestroy {
  protected readonly device = inject(DeviceService);
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;

  readonly spec = input.required<GarmentSpec>();
  readonly hotspots = input<Hotspot[]>([]);
  readonly name = input('');

  protected readonly use3D = signal(this.device.can3D());
  protected readonly ready = signal(false);
  protected readonly side = signal<'front' | 'back'>('front');
  protected readonly projected = signal<ProjectedHotspot[]>([]);
  protected readonly openHotspot = signal<string | null>(null);
  protected readonly fullscreen = signal(false);
  protected readonly hinted = signal(false);
  protected readonly stillView = signal<'front' | 'back' | 'angle'>('front');

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private scene: ViewerScene | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private io: IntersectionObserver | null = null;

  constructor() {
    // Push spec changes (colour/print) into the scene immediately.
    effect(() => {
      const spec = this.spec();
      untracked(() => this.scene?.apply(spec));
    });

    afterNextRender(() => {
      if (!this.use3D()) return;
      // Lazy: only build the scene when the viewer approaches the viewport.
      this.io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            this.io?.disconnect();
            this.init();
          }
        },
        { rootMargin: '200px' },
      );
      this.io.observe(this.host);
    });

    document.addEventListener('fullscreenchange', this.onFsChange);
  }

  private async init() {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return;
    try {
      const { ViewerScene } = await import('../../three/scenes/viewer-scene');
      this.scene = new ViewerScene(
        {
          canvas,
          host: this.stage().nativeElement,
          tier: this.device.tier(),
          reducedMotion: this.device.reducedMotion(),
          onSlow: () => this.device.downgrade(),
        },
        {
          onHotspots: (h) => this.projected.set(h),
          onReady: () => this.ready.set(true),
          onInteract: () => this.hinted.set(true),
        },
      );
      await this.scene.load(this.spec(), this.hotspots());
    } catch (err) {
      console.warn('[kiln] viewer fallback', err);
      this.use3D.set(false);
    }
  }

  // ── Controls ──
  showSide(side: 'front' | 'back') {
    this.side.set(side);
    this.openHotspot.set(null);
    if (this.scene) this.scene.showSide(side);
    else this.stillView.set(side);
  }

  zoom(dir: 1 | -1) {
    this.scene?.zoomBy(dir > 0 ? 0.8 : 1.25);
  }

  reset() {
    this.side.set('front');
    this.openHotspot.set(null);
    this.scene?.reset();
  }

  toggleHotspot(id: string) {
    const next = this.openHotspot() === id ? null : id;
    this.openHotspot.set(next);
    if (next) this.scene?.focusHotspot(next);
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (this.host.requestFullscreen) await this.host.requestFullscreen();
      else this.fullscreen.update((v) => !v); // iOS Safari: CSS fullscreen
    } catch {
      this.fullscreen.update((v) => !v);
    }
  }

  onKey(e: KeyboardEvent) {
    if (!this.scene) return;
    const map: Record<string, () => void> = {
      ArrowLeft: () => this.scene!.rotateBy(-0.35),
      ArrowRight: () => this.scene!.rotateBy(0.35),
      '+': () => this.zoom(1),
      '=': () => this.zoom(1),
      '-': () => this.zoom(-1),
      '0': () => this.reset(),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
      this.syncSide();
    }
  }

  onWheel(e: WheelEvent) {
    if (!this.scene || !(e.ctrlKey || this.fullscreen() || document.fullscreenElement)) return;
    e.preventDefault();
    this.scene.zoomBy(e.deltaY > 0 ? 1.08 : 0.92);
  }

  onPointerDown(e: PointerEvent) {
    if (!this.scene) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) this.scene.dragStart();
    if (this.pointers.size === 2) this.pinchDist = this.pinchDistance();
    this.hinted.set(true);
  }

  onPointerMove(e: PointerEvent) {
    const prev = this.pointers.get(e.pointerId);
    if (!prev || !this.scene) return;
    if (this.pointers.size === 1) {
      this.scene.dragMove(e.clientX - prev.x, e.clientY - prev.y);
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const d = this.pinchDistance();
      if (this.pinchDist > 0) this.scene.zoomBy(this.pinchDist / d);
      this.pinchDist = d;
    }
  }

  onPointerUp(e: PointerEvent) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      this.scene?.dragEnd();
      this.syncSide();
    }
    this.pinchDist = 0;
  }

  protected hotspotFor(id: string) {
    return this.hotspots().find((h) => h.id === id);
  }

  private syncSide() {
    setTimeout(() => this.scene && this.side.set(this.scene.facing), 350);
  }

  private pinchDistance() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private onFsChange = () => this.fullscreen.set(document.fullscreenElement === this.host);

  ngOnDestroy(): void {
    this.io?.disconnect();
    document.removeEventListener('fullscreenchange', this.onFsChange);
    this.scene?.dispose();
    this.scene = null;
  }
}
