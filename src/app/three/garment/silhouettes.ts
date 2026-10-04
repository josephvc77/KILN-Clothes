// ─────────────────────────────────────────────────────────────
// Garment silhouettes — pure 2D math, no Three.js.
// Shared by the WebGL garment builder and the SVG fallback so both
// always draw the same product.
//
// Units: garment space. Body is ~0.86 wide, ~1.2 tall, centred at 0.
// Outlines are authored as the RIGHT half, from the top centre going
// clockwise to the bottom centre, then mirrored.
// ─────────────────────────────────────────────────────────────

import type { GarmentKind } from '../../core/models/product';

export type Vec2 = [number, number];

export interface Neckline {
  /** half width of the neck opening */
  halfWidth: number;
  /** y at the side neck point (on the shoulder line) */
  sideY: number;
  /** y of the front neckline at centre */
  frontY: number;
  /** y of the back neckline at centre */
  backY: number;
}

export interface Silhouette {
  kind: GarmentKind;
  outline: Vec2[];          // closed, counter-clockwise, smoothed & resampled
  neck: Neckline;
  hemY: number;
  /** Rib band depth at hem (0 = none) */
  hemRib: number;
  /** Sleeve cuff segment endpoints for right sleeve [outer, inner] */
  cuff: [Vec2, Vec2];
  /** Right shoulder seam points: [neck side, shoulder point, armpit] */
  shoulder: [Vec2, Vec2, Vec2];
  cuffRib: number;
  hood: Vec2[] | null;
  pocket: Vec2[] | null;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

// ── Path helpers ────────────────────────────────────────────

class HalfPath {
  readonly pts: Vec2[] = [];
  constructor(x: number, y: number) {
    this.pts.push([x, y]);
  }
  private get last(): Vec2 {
    return this.pts[this.pts.length - 1];
  }
  line(x: number, y: number): this {
    this.pts.push([x, y]);
    return this;
  }
  quad(cx: number, cy: number, x: number, y: number, steps = 8): this {
    const [x0, y0] = this.last;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      this.pts.push([a * x0 + b * cx + c * x, a * y0 + b * cy + c * y]);
    }
    return this;
  }
}

function mirror(half: Vec2[]): Vec2[] {
  // half runs top-centre → bottom-centre on the right (clockwise).
  // Build a CCW full loop: bottom-centre → right side up → top-centre → left side down.
  const right = half.slice().reverse(); // bottom-centre → top-centre (CCW on right)
  const left = half.slice(1, -1).map(([x, y]) => [-x, y] as Vec2); // top → bottom on left
  return [...right, ...left];
}

function subdivide(loop: Vec2[], maxLen: number): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / maxLen));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

function chaikin(loop: Vec2[], iterations: number): Vec2[] {
  let pts = loop;
  for (let it = 0; it < iterations; it++) {
    const next: Vec2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    pts = next;
  }
  return pts;
}

/** Resample a closed loop to (approximately) uniform spacing */
export function resample(loop: Vec2[], step: number): Vec2[] {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push(l);
    total += l;
  }
  const n = Math.max(12, Math.round(total / step));
  const out: Vec2[] = [];
  let seg = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total;
    while (acc + segs[seg] < target && seg < segs.length - 1) {
      acc += segs[seg];
      seg++;
    }
    const a = loop[seg];
    const b = loop[(seg + 1) % loop.length];
    const t = segs[seg] > 0 ? (target - acc) / segs[seg] : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

function finish(half: Vec2[], smooth = 3): Vec2[] {
  return chaikin(subdivide(mirror(half), 0.035), smooth);
}

function boundsOf(pts: Vec2[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

// ── Neckline curves ─────────────────────────────────────────

export function frontNeckY(neck: Neckline, x: number): number {
  const t = Math.min(1, Math.abs(x) / neck.halfWidth);
  return neck.frontY + (neck.sideY - neck.frontY) * Math.pow(t, 1.9);
}

export function backNeckY(neck: Neckline, x: number): number {
  const t = Math.min(1, Math.abs(x) / neck.halfWidth);
  return neck.backY + (neck.sideY - neck.backY) * t * t;
}

// ── Silhouettes ─────────────────────────────────────────────

function tee(): Silhouette {
  const neck: Neckline = { halfWidth: 0.15, sideY: 0.565, frontY: 0.455, backY: 0.53 };
  const p = new HalfPath(0, neck.backY);
  // back neckline up to neck side
  for (let i = 1; i <= 6; i++) {
    const x = (i / 6) * neck.halfWidth;
    p.line(x, backNeckY(neck, x));
  }
  p.quad(0.28, 0.545, 0.405, 0.495)          // shoulder slope (dropped)
    .quad(0.54, 0.40, 0.665, 0.245)          // sleeve top
    .line(0.555, 0.105)                       // cuff
    .quad(0.47, 0.17, 0.425, 0.215)           // underarm to armpit
    .quad(0.43, 0.0, 0.438, -0.3)             // side body
    .line(0.44, -0.615)                       // to hem corner
    .quad(0.22, -0.632, 0, -0.63);            // hem, very slight curve
  const outline = finish(p.pts);
  return {
    kind: 'tee',
    outline,
    neck,
    hemY: -0.625,
    hemRib: 0,
    cuff: [[0.665, 0.245], [0.555, 0.105]],
    shoulder: [[neck.halfWidth, neck.sideY], [0.405, 0.495], [0.425, 0.215]],
    cuffRib: 0,
    hood: null,
    pocket: null,
    bounds: boundsOf(outline),
  };
}

function longSleeved(kind: 'longsleeve' | 'crew' | 'hoodie'): Silhouette {
  const heavy = kind !== 'longsleeve';
  const neck: Neckline =
    kind === 'hoodie'
      ? { halfWidth: 0.14, sideY: 0.57, frontY: 0.43, backY: 0.54 }
      : { halfWidth: 0.145, sideY: 0.565, frontY: 0.465, backY: 0.535 };
  const hem = kind === 'hoodie' ? -0.66 : kind === 'crew' ? -0.62 : -0.64;
  const rib = heavy ? 0.075 : 0;
  const bodyW = heavy ? 0.46 : 0.43;
  const ribW = heavy ? bodyW - 0.035 : bodyW;

  const p = new HalfPath(0, neck.backY);
  for (let i = 1; i <= 6; i++) {
    const x = (i / 6) * neck.halfWidth;
    p.line(x, backNeckY(neck, x));
  }
  p.quad(0.29, 0.55, heavy ? 0.43 : 0.41, 0.49)                    // shoulder
    .quad(0.62, 0.22, 0.79, -0.24)                                  // sleeve top, long
    .line(0.815, -0.33)                                             // into cuff (rib narrows)
    .line(0.735, -0.365)                                            // cuff edge
    .line(0.71, -0.275)                                             // cuff rib top inner
    .quad(0.58, 0.02, heavy ? 0.455 : 0.43, 0.19)                  // underarm
    .quad(bodyW + 0.005, 0.0, bodyW, -0.3)                          // side body
    .line(bodyW, hem + rib);                                        // down to rib start
  if (rib) {
    p.quad(bodyW - 0.005, hem + rib * 0.5, ribW, hem + rib * 0.3)   // gather into rib
      .line(ribW, hem);
  }
  p.quad(ribW * 0.5, hem - 0.004, 0, hem - 0.004);

  const outline = finish(p.pts);

  let hood: Vec2[] | null = null;
  let pocket: Vec2[] | null = null;
  if (kind === 'hoodie') {
    const h = new HalfPath(0, 0.965);
    h.quad(0.19, 0.965, 0.245, 0.8)
      .quad(0.28, 0.66, 0.225, 0.5)
      .line(0.1, 0.44)
      .line(0, 0.43);
    hood = finish(h.pts, 2);

    const k = new HalfPath(0, -0.14);
    k.line(0.19, -0.14).line(0.29, -0.3).line(0.3, -0.52).line(0, -0.52);
    pocket = finish(k.pts, 2);
  }

  return {
    kind,
    outline,
    neck,
    hemY: hem,
    hemRib: rib,
    cuff: [[0.815, -0.33], [0.735, -0.365]],
    shoulder: [[neck.halfWidth, neck.sideY], [heavy ? 0.43 : 0.41, 0.49], [heavy ? 0.455 : 0.43, 0.19]],
    cuffRib: 0.09,
    hood,
    pocket,
    bounds: boundsOf(outline),
  };
}

const cache = new Map<GarmentKind, Silhouette>();

export function silhouetteFor(kind: GarmentKind): Silhouette {
  let s = cache.get(kind);
  if (!s) {
    s = kind === 'tee' ? tee() : longSleeved(kind);
    cache.set(kind, s);
  }
  return s;
}

// ── Geometry queries ────────────────────────────────────────

export function pointInPolygon(x: number, y: number, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distanceToPolyline(x: number, y: number, poly: Vec2[], closed = true): number {
  let best = Infinity;
  const n = closed ? poly.length : poly.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + t * dx - x;
    const ey = ay + t * dy - y;
    const d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** SVG path (y flipped) for the fallback renderer */
export function toSvgPath(poly: Vec2[]): string {
  return poly.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(4)} ${(-y).toFixed(4)}`).join(' ') + 'Z';
}
