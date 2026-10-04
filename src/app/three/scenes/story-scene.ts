// ─────────────────────────────────────────────────────────────
// Home story scene. The DOM (GSAP ScrollTrigger) writes a target
// StoryState; the scene damps toward it every frame so scrubbing
// always feels weighted, never jittery.
// ─────────────────────────────────────────────────────────────

import { Group, MathUtils, Vector3 } from 'three';
import type { Colorway, GarmentSpec } from '../../core/models/product';
import { Garment, GARMENT_QUALITY } from '../garment/garment';
import { KilnEnvironment } from '../stage/kiln-environment';
import { Stage, StageOptions, damp } from '../stage/stage';

export interface StoryState {
  camX: number;
  camY: number;
  camZ: number;
  lookX: number;
  lookY: number;
  /** garment yaw (radians) */
  rotY: number;
  /** 0 = tee, 1 = hoodie (dissolve cross-fade through embers) */
  mix: number;
  heat: number;
  cool: number;
  /** ambient float amplitude */
  float: number;
  /** horizontal garment offset for layouts with a side panel */
  offsetX: number;
}

export const STORY_DEFAULT: StoryState = {
  camX: 0, camY: 0.05, camZ: 3.9, lookX: 0, lookY: -0.08, rotY: 0, mix: 0, heat: 0.65, cool: 0, float: 1, offsetX: 0,
};

export class StoryScene extends Stage {
  readonly target: StoryState = { ...STORY_DEFAULT };
  private readonly cur: StoryState = { ...STORY_DEFAULT };
  private readonly env: KilnEnvironment;
  private readonly pivot = new Group();
  private readonly teeHolder = new Group();
  private readonly hoodieHolder = new Group();
  private tee?: Garment;
  private hoodie?: Garment;
  private pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  private dragYaw = 0;
  private dragVel = 0;
  private dragging = false;
  private intro = 1; // dissolve amount for the entrance
  private look = new Vector3();

  constructor(opts: StageOptions) {
    super(opts);
    this.env = new KilnEnvironment(opts.tier, opts.reducedMotion);
    this.scene.add(this.env.group, this.pivot);
    this.pivot.add(this.teeHolder, this.hoodieHolder);
    this.intro = opts.reducedMotion ? 0 : 1;
  }

  async load(tee: GarmentSpec, hoodie: GarmentSpec): Promise<void> {
    const q = GARMENT_QUALITY[this.opts.tier];
    this.tee = await Garment.create(tee, q);
    if (this.disposed) return this.tee.dispose();
    this.teeHolder.add(this.tee.group);
    this.tee.dissolve.uDissolve.value = this.intro;
    this.start();
    // Build the hoodie after first paint so the hero appears fast.
    await idle();
    if (this.disposed) return;
    this.hoodie = await Garment.create(hoodie, GARMENT_QUALITY[this.opts.tier === 'high' ? 'medium' : this.opts.tier]);
    if (this.disposed) return this.hoodie.dispose();
    this.hoodie.dissolve.uDissolve.value = 1;
    this.hoodie.group.visible = false;
    this.hoodieHolder.add(this.hoodie.group);
  }

  /** Entrance: garment forms out of the embers. */
  playIntro(duration = 2.2): void {
    if (this.opts.reducedMotion) {
      this.intro = 0;
      return;
    }
    const start = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / (duration * 1000));
      this.intro = 1 - easeOutCubic(t);
      if (t < 1 && !this.disposed) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  setPointer(nx: number, ny: number): void {
    this.pointer.x = nx;
    this.pointer.y = ny;
  }

  setColorway(which: 'tee' | 'hoodie', c: Colorway): void {
    (which === 'tee' ? this.tee : this.hoodie)?.setColorway(c);
  }

  // ── Drag-to-rotate (showcase chapter) ──
  dragStart(): void {
    this.dragging = true;
    this.dragVel = 0;
  }
  dragMove(dxPx: number): void {
    const d = (dxPx / Math.max(320, this.width)) * Math.PI * 1.6;
    this.dragYaw += d;
    this.dragVel = d;
  }
  dragEnd(): void {
    this.dragging = false;
  }
  nudge(radians: number): void {
    this.dragVel = radians * 0.12;
  }
  resetDrag(): void {
    this.dragYaw = 0;
    this.dragVel = 0;
  }

  protected override update(dt: number, time: number): void {
    const t = this.target;
    const c = this.cur;
    const k = 3.2;
    (Object.keys(c) as (keyof StoryState)[]).forEach((key) => {
      c[key] = damp(c[key], t[key], key === 'mix' ? 5 : k, dt || 1);
    });

    // Pointer (smoothed) — subtle parallax + garment tilt
    this.pointer.sx = damp(this.pointer.sx, this.pointer.x, 2.5, dt || 1);
    this.pointer.sy = damp(this.pointer.sy, this.pointer.y, 2.5, dt || 1);

    // Drag inertia
    if (!this.dragging) {
      this.dragYaw += this.dragVel;
      this.dragVel *= Math.pow(0.9, (dt || 0.016) * 60);
    }

    const bob = this.opts.reducedMotion ? 0 : Math.sin(time * 0.9) * 0.035 * c.float;
    this.pivot.position.set(c.offsetX, bob, 0);
    this.pivot.rotation.y = c.rotY + this.dragYaw + this.pointer.sx * 0.35 * c.float + (this.opts.reducedMotion ? 0 : Math.sin(time * 0.35) * 0.06 * c.float);
    this.pivot.rotation.x = -this.pointer.sy * 0.08 * c.float;
    this.pivot.rotation.z = this.opts.reducedMotion ? 0 : Math.sin(time * 0.6) * 0.012 * c.float;

    // Cross-dissolve tee → hoodie through the heat
    const teeD = Math.max(this.intro, MathUtils.clamp(c.mix * 2, 0, 1));
    const hoodD = 1 - MathUtils.clamp(c.mix * 2 - 1, 0, 1);
    if (this.tee) {
      this.tee.dissolve.uDissolve.value = teeD;
      this.tee.group.visible = teeD < 0.999;
    }
    if (this.hoodie) {
      this.hoodie.dissolve.uDissolve.value = hoodD;
      this.hoodie.group.visible = hoodD < 0.999;
    }
    // Heat surges mid-transition
    const surge = Math.sin(Math.PI * MathUtils.clamp(c.mix, 0, 1)) * 0.6;
    this.env.heat = MathUtils.clamp(c.heat + surge + this.intro * 0.4, 0, 1.4);
    this.env.cool = c.cool;
    this.env.setShadow(-0.66 + bob);
    this.env.update(time);

    // Portrait screens: pull back so the garment's width still fits.
    const fit = this.camera.aspect < 1 ? Math.min(1.9, 0.72 / this.camera.aspect) : 1;
    this.camera.position.set(c.camX + this.pointer.sx * 0.08, c.camY + this.pointer.sy * 0.05, c.camZ * fit);
    this.look.set(c.lookX + c.offsetX * 0.0, c.lookY, 0);
    this.camera.lookAt(this.look);
  }

  override dispose(): void {
    this.tee?.dispose();
    this.hoodie?.dispose();
    this.env.dispose();
    super.dispose();
  }
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const idle = () =>
  new Promise<void>((r) => ('requestIdleCallback' in window ? (window as Window).requestIdleCallback(() => r(), { timeout: 1200 }) : setTimeout(r, 300)));
