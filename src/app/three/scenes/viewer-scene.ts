// ─────────────────────────────────────────────────────────────
// Product viewer: inspect a single garment.
// Orbit (yaw/pitch with inertia), zoom (wheel, pinch, buttons),
// front/back presets, and projected hotspots for the DOM layer.
// ─────────────────────────────────────────────────────────────

import { Group, MathUtils, Vector3 } from 'three';
import type { GarmentSpec, Hotspot } from '../../core/models/product';
import { Garment, GARMENT_QUALITY } from '../garment/garment';
import { KilnEnvironment } from '../stage/kiln-environment';
import { Stage, StageOptions, damp } from '../stage/stage';

export interface ProjectedHotspot {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

export interface ViewerCallbacks {
  onHotspots?: (h: ProjectedHotspot[]) => void;
  onReady?: () => void;
  onInteract?: () => void;
}

const ZOOM_MIN = 1.55;
const ZOOM_MAX = 4.4;
const ZOOM_DEFAULT = 3.55;

export class ViewerScene extends Stage {
  private readonly env: KilnEnvironment;
  private readonly pivot = new Group();
  private garment?: Garment;
  private pendingSpec?: GarmentSpec;
  private hotspots: Hotspot[] = [];
  private readonly tmp = new Vector3();
  private readonly camDir = new Vector3();
  private readonly normal = new Vector3();

  private yaw = -0.35;
  private pitch = 0.06;
  private yawT = 0;
  private pitchT = 0.04;
  private zoom = ZOOM_DEFAULT + 0.6;
  private zoomT = ZOOM_DEFAULT;
  private velYaw = 0;
  private dragging = false;
  private idleTime = 0;
  private lastEmit = 0;
  private dissolve = 1;

  constructor(opts: StageOptions, private readonly cb: ViewerCallbacks = {}) {
    super(opts);
    this.env = new KilnEnvironment(opts.tier, true, -0.86);
    this.env.heat = 0.25;
    this.env.cool = 1;
    this.scene.add(this.env.group, this.pivot);
    this.dissolve = opts.reducedMotion ? 0 : 1;
  }

  async load(spec: GarmentSpec, hotspots: Hotspot[]): Promise<void> {
    this.hotspots = hotspots;
    this.garment = await Garment.create(spec, GARMENT_QUALITY[this.opts.tier]);
    if (this.disposed) return this.garment.dispose();
    this.pivot.add(this.garment.group);
    if (this.pendingSpec) this.apply(this.pendingSpec);
    this.start();
    this.cb.onReady?.();
  }

  apply(spec: GarmentSpec): void {
    if (!this.garment) {
      this.pendingSpec = spec;
      return;
    }
    this.garment.setColorway(spec.colorway);
    this.garment.setPrints(spec.front, spec.back);
    if (!this.visible) this.renderOnce();
  }

  // ── Controls ──
  dragStart(): void {
    this.dragging = true;
    this.velYaw = 0;
    this.cb.onInteract?.();
  }
  dragMove(dx: number, dy: number): void {
    const s = Math.PI / Math.max(360, this.width * 0.8);
    this.yawT += dx * s;
    this.velYaw = dx * s;
    this.pitchT = MathUtils.clamp(this.pitchT + dy * s * 0.6, -0.35, 0.45);
    this.idleTime = 0;
  }
  dragEnd(): void {
    this.dragging = false;
  }
  zoomBy(factor: number): void {
    this.zoomT = MathUtils.clamp(this.zoomT * factor, ZOOM_MIN, ZOOM_MAX);
    this.idleTime = 0;
    this.cb.onInteract?.();
  }
  get zoomLevel(): number {
    return 1 - (this.zoomT - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);
  }
  rotateBy(radians: number): void {
    this.yawT += radians;
    this.idleTime = 0;
    this.cb.onInteract?.();
  }
  showSide(side: 'front' | 'back'): void {
    // Take the shortest path to the nearest multiple that matches the side.
    const base = side === 'front' ? 0 : Math.PI;
    const turns = Math.round((this.yawT - base) / (Math.PI * 2));
    this.yawT = base + turns * Math.PI * 2;
    this.pitchT = 0.04;
    this.idleTime = 0;
    this.cb.onInteract?.();
  }
  reset(): void {
    this.showSide('front');
    this.zoomT = ZOOM_DEFAULT;
  }
  focusHotspot(id: string): void {
    const h = this.hotspots.find((x) => x.id === id);
    if (!h) return;
    this.showSide(h.side);
    this.zoomT = 2.4;
  }
  get facing(): 'front' | 'back' {
    const y = ((this.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return y > Math.PI / 2 && y < (Math.PI * 3) / 2 ? 'back' : 'front';
  }

  protected override update(dt: number, time: number): void {
    const step = dt || 1;
    if (!this.dragging) {
      this.yawT += this.velYaw;
      this.velYaw *= Math.pow(0.9, (dt || 0.016) * 60);
      this.idleTime += dt;
      // Gentle idle turntable after 6s without interaction
      if (!this.opts.reducedMotion && this.idleTime > 6) this.yawT += dt * 0.12;
    }
    this.yaw = damp(this.yaw, this.yawT, 7, step);
    this.pitch = damp(this.pitch, this.pitchT, 7, step);
    this.zoom = damp(this.zoom, this.zoomT, 5, step);

    if (this.dissolve > 0 && this.garment) {
      this.dissolve = Math.max(0, this.dissolve - dt * 0.7);
      this.garment.dissolve.uDissolve.value = easeInOut(this.dissolve);
    }

    this.pivot.rotation.y = this.yaw;
    const bob = this.opts.reducedMotion ? 0 : Math.sin(time * 0.9) * 0.018;
    this.pivot.position.y = bob;

    const zoomT = 1 - (this.zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);
    const lookY = MathUtils.lerp(-0.1, 0.1, zoomT);
    this.camera.position.set(
      Math.sin(0) * this.zoom,
      lookY + Math.sin(this.pitch) * this.zoom,
      Math.cos(this.pitch) * this.zoom,
    );
    this.camera.lookAt(0, lookY, 0);

    this.env.setShadow(-0.66 + bob);
    this.env.update(time);
    this.emitHotspots(time);
  }

  private emitHotspots(time: number) {
    if (!this.cb.onHotspots || !this.garment) return;
    if (time - this.lastEmit < 1 / 30) return;
    this.lastEmit = time;
    this.pivot.updateMatrixWorld();
    this.camera.getWorldDirection(this.camDir);
    const out: ProjectedHotspot[] = this.hotspots.map((h) => {
      const local = this.garment!.surface(h.x, h.y, h.side, 0.02);
      this.tmp.copy(local).applyMatrix4(this.pivot.matrixWorld);
      // facing test: the side's outward normal vs camera
      this.normal.set(0, 0, h.side === 'front' ? 1 : -1).applyQuaternion(this.pivot.quaternion);
      const facing = this.normal.dot(this.camDir) < -0.2;
      this.tmp.project(this.camera);
      return {
        id: h.id,
        x: (this.tmp.x * 0.5 + 0.5) * this.width,
        y: (-this.tmp.y * 0.5 + 0.5) * this.height,
        visible: facing && this.dissolve <= 0.05,
      };
    });
    this.cb.onHotspots(out);
  }

  override dispose(): void {
    this.garment?.dispose();
    this.env.dispose();
    super.dispose();
  }
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
