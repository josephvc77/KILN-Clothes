// ─────────────────────────────────────────────────────────────
// Stage: renderer + scene + camera + loop lifecycle.
// Scenes extend it and implement update(). Handles DPR caps,
// resize, off-screen pausing, adaptive quality and disposal.
// ─────────────────────────────────────────────────────────────

import {
  ACESFilmicToneMapping,
  Clock,
  Object3D,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Texture,
  WebGLRenderer,
  Mesh,
  Material,
  Points,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Tier = 'high' | 'medium' | 'low';

export interface StageOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  tier: Tier;
  reducedMotion: boolean;
  /** Called when frame times stay above budget */
  onSlow?: () => void;
}

const DPR_CAP: Record<Tier, number> = { high: 2, medium: 1.5, low: 1 };

export abstract class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  protected readonly clock = new Clock(false);
  protected width = 1;
  protected height = 1;
  protected visible = true;
  protected disposed = false;
  private raf = 0;
  private envTex: Texture | null = null;
  private resizeObs: ResizeObserver;
  private intersectObs: IntersectionObserver;
  private slowFrames = 0;
  /** Subclass fields aren't initialised during the base constructor — never render before start(). */
  private started = false;
  private frameCount = 0;

  constructor(protected readonly opts: StageOptions) {
    this.renderer = new WebGLRenderer({
      canvas: opts.canvas,
      alpha: true,
      antialias: opts.tier !== 'low',
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP[opts.tier]));

    this.camera = new PerspectiveCamera(32, 1, 0.05, 50);

    const pmrem = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.envTex = pmrem.fromScene(room, 0.04).texture;
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = 0.45;
    room.dispose();
    pmrem.dispose();

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(opts.host);
    this.intersectObs = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible) this.start();
        else this.stop();
      },
      { rootMargin: '120px' },
    );
    this.intersectObs.observe(opts.host);
    this.resize();

    opts.canvas.addEventListener('webglcontextlost', this.onContextLost);
  }

  protected abstract update(dt: number, time: number): void;

  start(): void {
    this.started = true;
    if (this.raf || this.disposed || !this.visible) return;
    this.clock.start();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 1 / 20);
      this.watchBudget(dt);
      this.update(dt, this.clock.elapsedTime);
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.clock.stop();
  }

  /** Render one frame synchronously (reduced-motion / static states) */
  renderOnce(): void {
    if (!this.started || this.disposed) return;
    this.update(0, this.clock.elapsedTime);
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const rect = this.opts.host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.onResize(w, h);
    if (!this.raf) this.renderOnce();
  }

  protected onResize(_w: number, _h: number): void {}

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.resizeObs.disconnect();
    this.intersectObs.disconnect();
    this.opts.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    disposeTree(this.scene);
    this.envTex?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private watchBudget(dt: number) {
    // After warm-up, 90 of the last ~120 frames over 28ms → ask for a lower tier.
    this.frameCount++;
    if (this.frameCount < 90) return;
    if (dt > 0.028) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 90) {
      this.slowFrames = 0;
      this.frameCount = 0;
      const cur = this.renderer.getPixelRatio();
      if (cur > 1) this.renderer.setPixelRatio(Math.max(1, cur - 0.5));
      else this.opts.onSlow?.();
    }
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.stop();
    this.opts.onSlow?.();
  };
}

/** Dispose every geometry/material/texture reachable from a subtree. */
export function disposeTree(root: Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh | Points;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const m of mats as Material[]) {
      for (const value of Object.values(m)) {
        if (value && (value as Texture).isTexture) (value as Texture).dispose();
      }
      m.dispose();
    }
  });
}

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));
