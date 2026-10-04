// ─────────────────────────────────────────────────────────────
// Inflated cloth geometry.
//
// A garment silhouette is meshed (Delaunay over boundary + interior
// samples), then each vertex is lifted by a height field built from
// its distance to the seam: a rounded edge profile, torso volume,
// and procedural folds (sleeve compression rings, armpit drag lines,
// hem drape, rib-hem blousing). Front and back sheets share the side
// seam so normals flow smoothly around the edge.
// ─────────────────────────────────────────────────────────────

import Delaunator from 'delaunator';
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { Silhouette, Vec2, distanceToPolyline, frontNeckY, pointInPolygon, resample } from './silhouettes';
import { fbm2, smoothstep } from './noise';
import { uvOf } from './uv-frame';

export interface MeshQuality {
  /** interior sample spacing (garment units) */
  step: number;
  /** boundary sample spacing */
  edgeStep: number;
}

export type HeightFn = (x: number, y: number, d: number, side: 1 | -1) => number;

export interface InflateOptions {
  outline: Vec2[];
  quality: MeshQuality;
  height: HeightFn;
  /** true → remove from FRONT sheet (neck opening) */
  frontCut?: (x: number, y: number) => boolean;
  /** extra sample points (e.g. along the neck cut) */
  extraPoints?: Vec2[];
  /** mirror u on the back sheet so back prints read correctly from behind */
  mirrorBackUV?: boolean;
}

/**
 * Returns a geometry with two groups: 0 = front sheet, 1 = back sheet.
 */
export function inflate(opts: InflateOptions): BufferGeometry {
  const { outline, quality, height, frontCut, extraPoints = [], mirrorBackUV = true } = opts;
  const boundary = resample(outline, quality.edgeStep);
  const B = boundary.length;

  // ── Sample interior on a hex lattice ──
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of boundary) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const s = quality.step;
  const interior: Vec2[] = [];
  const interiorD: number[] = [];
  const rowH = s * 0.866;
  let row = 0;
  for (let y = minY + rowH * 0.5; y < maxY; y += rowH, row++) {
    for (let x = minX + (row % 2 ? s * 0.5 : 0); x < maxX; x += s) {
      if (!pointInPolygon(x, y, boundary)) continue;
      const d = distanceToPolyline(x, y, boundary);
      if (d < s * 0.45) continue;
      interior.push([x, y]);
      interiorD.push(d);
    }
  }
  for (const [x, y] of extraPoints) {
    if (!pointInPolygon(x, y, boundary)) continue;
    const d = distanceToPolyline(x, y, boundary);
    if (d < s * 0.3) continue;
    interior.push([x, y]);
    interiorD.push(d);
  }
  const I = interior.length;

  // ── Triangulate ──
  const flat = new Float64Array((B + I) * 2);
  boundary.forEach(([x, y], i) => { flat[i * 2] = x; flat[i * 2 + 1] = y; });
  interior.forEach(([x, y], i) => { flat[(B + i) * 2] = x; flat[(B + i) * 2 + 1] = y; });
  const del = new Delaunator(flat);
  const tris = del.triangles;
  const pt = (i: number): Vec2 => [flat[i * 2], flat[i * 2 + 1]];
  const maxEdge = Math.max(s, quality.edgeStep) * 2.6;

  const front: number[] = [];
  const back: number[] = [];
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    const [ax, ay] = pt(a), [bx, by] = pt(b), [cx, cy] = pt(c);
    if (Math.hypot(ax - bx, ay - by) > maxEdge || Math.hypot(bx - cx, by - cy) > maxEdge || Math.hypot(cx - ax, cy - ay) > maxEdge) continue;
    const mx = (ax + bx + cx) / 3;
    const my = (ay + by + cy) / 3;
    if (!pointInPolygon(mx, my, boundary)) continue;
    // Front faces must be CCW seen from +z; back faces CCW seen from −z.
    const ccw = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) > 0;
    const [p, q] = ccw ? [b, c] : [c, b];
    if (!frontCut || !frontCut(mx, my)) front.push(a, p, q);
    back.push(a, q, p);
  }

  // ── Shared-seam geometry for smooth normals ──
  // vertices: [boundary(B), frontInterior(I), backInterior(I)]
  const V = B + 2 * I;
  const pos = new Float32Array(V * 3);
  for (let i = 0; i < B; i++) {
    pos[i * 3] = boundary[i][0];
    pos[i * 3 + 1] = boundary[i][1];
    pos[i * 3 + 2] = 0;
  }
  for (let i = 0; i < I; i++) {
    const [x, y] = interior[i];
    const d = interiorD[i];
    const fi = B + i;
    const bi = B + I + i;
    pos[fi * 3] = x; pos[fi * 3 + 1] = y; pos[fi * 3 + 2] = height(x, y, d, 1);
    pos[bi * 3] = x; pos[bi * 3 + 1] = y; pos[bi * 3 + 2] = -height(x, y, d, -1);
  }
  const mapBack = (i: number) => (i < B ? i : i + I);
  const backIdx = back.map(mapBack);

  const shared = new BufferGeometry();
  shared.setAttribute('position', new BufferAttribute(pos, 3));
  shared.setIndex([...front, ...backIdx]);
  shared.computeVertexNormals();
  const nrm = shared.getAttribute('normal').array as Float32Array;

  // ── Final geometry: duplicate the seam so each sheet has its own UVs ──
  const Vf = V + B;
  const fpos = new Float32Array(Vf * 3);
  const fnrm = new Float32Array(Vf * 3);
  const fuv = new Float32Array(Vf * 2);
  fpos.set(pos);
  fnrm.set(nrm);
  fpos.set(pos.subarray(0, B * 3), V * 3);
  fnrm.set(nrm.subarray(0, B * 3), V * 3);
  for (let i = 0; i < Vf; i++) {
    const x = fpos[i * 3];
    const y = fpos[i * 3 + 1];
    const [u, v] = uvOf(x, y);
    const isBack = i >= B + I;
    fuv[i * 2] = isBack && mirrorBackUV ? 1 - u : u;
    fuv[i * 2 + 1] = v;
  }
  const backFinal = back.map((i) => (i < B ? V + i : i + I));

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(fpos, 3));
  geo.setAttribute('normal', new BufferAttribute(fnrm, 3));
  geo.setAttribute('uv', new BufferAttribute(fuv, 2));
  geo.setIndex([...front, ...backFinal]);
  geo.addGroup(0, front.length, 0);
  geo.addGroup(front.length, backFinal.length, 1);
  geo.computeBoundingSphere();
  shared.dispose();
  return geo;
}

// ── Height fields ───────────────────────────────────────────

const circ = (t: number) => {
  const k = Math.min(1, Math.max(0, t));
  return Math.sqrt(1 - (1 - k) * (1 - k));
};

export interface BodyParams {
  edgeR: number;
  edgeH: number;
  bodyH: number;
  bodyFall: number;
  wrinkle: number;
}

export function bodyHeight(sil: Silhouette, heavy: boolean): { fn: HeightFn; params: BodyParams } {
  const params: BodyParams = heavy
    ? { edgeR: 0.15, edgeH: 0.13, bodyH: 0.085, bodyFall: 0.2, wrinkle: 1.25 }
    : { edgeR: 0.13, edgeH: 0.115, bodyH: 0.06, bodyFall: 0.18, wrinkle: 1 };
  const [, shoulderPt, armpit] = sil.shoulder;
  const [cOut, cIn] = sil.cuff;
  // sleeve axis: from shoulder/armpit midpoint to cuff midpoint
  const sx = (shoulderPt[0] + armpit[0]) / 2;
  const sy = (shoulderPt[1] + armpit[1]) / 2;
  const ex = (cOut[0] + cIn[0]) / 2;
  const ey = (cOut[1] + cIn[1]) / 2;
  const axLen = Math.hypot(ex - sx, ey - sy);
  const ax = (ex - sx) / axLen;
  const ay = (ey - sy) / axLen;
  const sleeveBoundaryX = (armpit[0] + shoulderPt[0]) / 2;
  const hemTop = sil.hemY + sil.hemRib;

  const fn: HeightFn = (x, y, d, side) => {
    const edge = params.edgeH * circ(d / params.edgeR);
    const body = params.bodyH * (1 - Math.exp(-d / params.bodyFall));
    let h = edge + body;

    const ox = side === 1 ? 0 : 17.3; // decorrelate back folds
    const ax_ = Math.abs(x);
    const m = circ(d / (params.edgeR * 0.9)); // wrinkles fade to zero at the seam
    let w = fbm2(x * 4.2 + ox, y * 4.2) * 0.012;

    // Sleeve: compression rings perpendicular to the arm, stacking towards the cuff
    const inSleeve = smoothstep(sleeveBoundaryX - 0.03, sleeveBoundaryX + 0.05, ax_);
    if (inSleeve > 0) {
      const px = ax_ - sx;
      const py = y - sy;
      const along = px * ax + py * ay; // 0 at shoulder → axLen at cuff
      const t = along / axLen;
      const freq = 24 + t * 30;
      const phase = fbm2(ax_ * 3 + ox, y * 3) * 3;
      const amp = (0.006 + 0.012 * smoothstep(0.35, 1, t) * (sil.cuffRib ? 1 : 0.4)) * params.wrinkle;
      w += Math.sin(along * freq + phase) * amp * inSleeve;
    }

    // Armpit drag lines radiating onto the chest
    const dxA = ax_ - armpit[0];
    const dyA = y - armpit[1];
    const rA = Math.hypot(dxA, dyA);
    const angA = Math.atan2(dyA, dxA);
    w += Math.sin(angA * 7 + rA * 12) * 0.009 * Math.exp(-rA / 0.12) * params.wrinkle;

    // Hem: soft vertical drape on tees; gathers above the rib on fleece
    if (sil.hemRib > 0) {
      const gather = Math.exp(-Math.pow((y - hemTop - 0.04) / 0.05, 2));
      w += (Math.sin(x * 34 + fbm2(x * 6, 3.1) * 4) * 0.009 + 0.012) * gather * params.wrinkle;
      // rib band hugs tighter
      if (y < hemTop) h *= 0.86 + 0.14 * smoothstep(sil.hemY, hemTop, y);
    } else {
      const drape = smoothstep(sil.hemY + 0.3, sil.hemY + 0.02, y);
      w += Math.sin(x * 20 + fbm2(x * 3 + ox, 0.7) * 5) * 0.007 * drape * params.wrinkle;
    }

    // Chest: slightly fuller, belly slightly flatter
    h += 0.018 * Math.exp(-Math.pow((y - 0.22) / 0.2, 2)) * (1 - smoothstep(0.1, 0.4, ax_));

    return Math.max(0, h + w * m);
  };
  return { fn, params };
}

/** Hood (hoodie): convex back, concave dished front showing the lining */
export function hoodHeight(depthBack: number, depthFront: number): HeightFn {
  return (x, y, d, side) => {
    const p = circ(d / 0.12);
    const bottomFade = smoothstep(0.42, 0.56, y);
    const drape = fbm2(x * 5, y * 5 + 9) * 0.01;
    const base = side === 1 ? depthFront : depthBack;
    return (p * base + drape * p) * (0.35 + 0.65 * bottomFade);
  };
}

/** Pocket patch sits proud of the body */
export function pocketHeight(): HeightFn {
  return (x, y, d) => 0.012 * circ(d / 0.03) + fbm2(x * 8, y * 8) * 0.002;
}

export function neckCut(sil: Silhouette) {
  return (x: number, y: number) => Math.abs(x) < sil.neck.halfWidth * 0.995 && y > frontNeckY(sil.neck, x);
}

export function neckCutPoints(sil: Silhouette, step: number): Vec2[] {
  const pts: Vec2[] = [];
  const n = Math.ceil((sil.neck.halfWidth * 2) / (step * 0.5));
  for (let i = 0; i <= n; i++) {
    const x = -sil.neck.halfWidth + (2 * sil.neck.halfWidth * i) / n;
    pts.push([x, frontNeckY(sil.neck, x) - step * 0.02]);
  }
  return pts;
}

/** Sample the front surface at (x, y) — used to place collars, cords and hotspots. */
export function surfacePoint(sil: Silhouette, h: HeightFn, x: number, y: number, side: 1 | -1, out = new Vector3()): Vector3 {
  const d = distanceToPolyline(x, y, sil.outline);
  const inside = pointInPolygon(x, y, sil.outline);
  const z = inside ? h(x, y, d, side) : 0;
  return out.set(x, y, z * side);
}
