// ─────────────────────────────────────────────────────────────
// Fabric surface: albedo (dye + heather + print) and a normal map
// carrying knit, seams, stitch lines and rib bands — all in the
// shared UV frame, generated from the silhouette.
// ─────────────────────────────────────────────────────────────

import type { Colorway, PrintId } from '../../core/models/product';
import { Silhouette, Vec2, frontNeckY, backNeckY } from './silhouettes';
import { paintPrint } from './prints';
import { toCanvas, unitsToPx } from './uv-frame';

export type Side = 'front' | 'back';

// ── Albedo ──────────────────────────────────────────────────

export function paintFabric(canvas: HTMLCanvasElement, colorway: Colorway, print: PrintId, side: Side): void {
  const size = canvas.width;
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = colorway.fabric;
  ctx.fillRect(0, 0, size, size);

  // Garment-dye variation: large, very soft tonal drift.
  const g = ctx.createRadialGradient(size * 0.5, size * 0.35, size * 0.05, size * 0.5, size * 0.5, size * 0.7);
  g.addColorStop(0, 'rgba(255,255,255,0.035)');
  g.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  if (colorway.heather) heather(ctx, size);

  paintPrint(ctx, size, print, colorway.ink, side === 'front' ? 3 : 7);
}

function heather(ctx: CanvasRenderingContext2D, size: number) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  let s = 1234567;
  for (let i = 0; i < d.length; i += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const r = s / 0x7fffffff;
    // Short vertical "yarn" streaks: correlate with the pixel above.
    const n = r < 0.08 ? 22 : r > 0.93 ? -18 : (r - 0.5) * 10;
    d[i] = clamp8(d[i] + n);
    d[i + 1] = clamp8(d[i + 1] + n);
    d[i + 2] = clamp8(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

const clamp8 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

// ── Normal map ──────────────────────────────────────────────

interface NormalOptions {
  size: number;
  heavy: boolean;
  side: Side;
}

/**
 * Draws seams/stitches/ribs as a height field (R = groove, G = raised),
 * adds procedural knit, then converts to a tangent-space normal map.
 */
export function buildNormalCanvas(sil: Silhouette, opts: NormalOptions): HTMLCanvasElement {
  const { size, heavy, side } = opts;
  const features = document.createElement('canvas');
  features.width = features.height = size;
  const f = features.getContext('2d', { willReadFrequently: true })!;
  f.fillStyle = '#000';
  f.fillRect(0, 0, size, size);
  f.globalCompositeOperation = 'lighter';
  const P = (x: number, y: number) => toCanvas(x, y, size);
  const U = (n: number) => unitsToPx(n, size);

  const groove = 'rgb(255,0,0)';
  const raised = 'rgb(0,255,0)';

  const stroke = (pts: Vec2[], color: string, width: number, dash?: number[], blur = 0) => {
    f.save();
    f.strokeStyle = color;
    f.lineWidth = Math.max(1, U(width));
    f.lineCap = 'round';
    f.lineJoin = 'round';
    if (dash) f.setLineDash(dash.map(U));
    if (blur) f.filter = `blur(${U(blur)}px)`;
    f.beginPath();
    pts.forEach(([x, y], i) => {
      const [px, py] = P(x, y);
      if (i) f.lineTo(px, py);
      else f.moveTo(px, py);
    });
    f.stroke();
    f.restore();
  };
  const both = (pts: Vec2[], fn: (p: Vec2[]) => void) => {
    fn(pts);
    fn(pts.map(([x, y]) => [-x, y] as Vec2));
  };

  const [neckSide, shoulderPt, armpit] = sil.shoulder;

  // Shoulder seam (runs neck → shoulder point)
  both([neckSide, [shoulderPt[0], shoulderPt[1] - 0.004]], (p) => stroke(p, groove, 0.006, undefined, 0.003));
  // Armhole seam (dropped shoulder → armpit), gently curved
  const arm: Vec2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = shoulderPt[0] + (armpit[0] - shoulderPt[0]) * t - Math.sin(t * Math.PI) * 0.025;
    const y = shoulderPt[1] + (armpit[1] - shoulderPt[1]) * t;
    arm.push([x, y]);
  }
  both(arm, (p) => {
    stroke(p, groove, 0.007, undefined, 0.003);
    stroke(p.map(([x, y]) => [x + 0.012, y] as Vec2), raised, 0.0022, [0.006, 0.004]);
  });

  // Neckline stitch line (front or back)
  const neck: Vec2[] = [];
  for (let i = 0; i <= 24; i++) {
    const x = -sil.neck.halfWidth + (2 * sil.neck.halfWidth * i) / 24;
    const y = side === 'front' ? frontNeckY(sil.neck, x) : backNeckY(sil.neck, x);
    neck.push([x * 1.12, y - 0.035]);
  }
  stroke(neck, raised, 0.0022, [0.006, 0.004]);
  if (side === 'back') {
    // taped back neck: a raised band
    stroke(neck.map(([x, y]) => [x, y + 0.02] as Vec2), raised, 0.02, undefined, 0.004);
  }

  // Hem: twin-needle on tees, rib band on fleece
  const hemW = 0.5;
  if (sil.hemRib > 0) {
    ribBand(f, P, U, [-hemW, sil.hemY], [hemW, sil.hemY + sil.hemRib], heavy);
    stroke([[-hemW, sil.hemY + sil.hemRib], [hemW, sil.hemY + sil.hemRib]], groove, 0.006, undefined, 0.002);
  } else {
    for (const off of [0.028, 0.036]) {
      stroke([[-hemW, sil.hemY + off], [hemW, sil.hemY + off]], raised, 0.0022, [0.006, 0.004]);
    }
    stroke([[-hemW, sil.hemY + 0.042], [hemW, sil.hemY + 0.042]], groove, 0.004, undefined, 0.003);
  }

  // Cuffs
  const [cOut, cIn] = sil.cuff;
  const dir: Vec2 = [cIn[0] - cOut[0], cIn[1] - cOut[1]];
  const len = Math.hypot(dir[0], dir[1]);
  const along: Vec2 = [-dir[1] / len, dir[0] / len]; // perpendicular, into the sleeve
  const inward = along[1] > 0 ? along : ([-along[0], -along[1]] as Vec2);
  const band = sil.cuffRib > 0 ? sil.cuffRib : 0.032;
  both(
    [
      [cOut[0] + inward[0] * band - dir[0] * 0.2, cOut[1] + inward[1] * band - dir[1] * 0.2],
      [cIn[0] + inward[0] * band + dir[0] * 0.2, cIn[1] + inward[1] * band + dir[1] * 0.2],
    ],
    (p) => stroke(p, groove, 0.005, undefined, 0.002),
  );
  if (sil.cuffRib > 0) {
    both([cOut, cIn], (p) => {
      // ribs run along the sleeve: draw many short strokes parallel to `inward`
      const n = 18;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const sx = p[0][0] + (p[1][0] - p[0][0]) * t;
        const sy = p[0][1] + (p[1][1] - p[0][1]) * t;
        const sign = p[0][0] < 0 ? -1 : 1;
        stroke([[sx, sy], [sx + inward[0] * band * sign, sy + inward[1] * band]], raised, 0.0028, undefined, 0.0012);
      }
    });
  }

  // Kangaroo pocket (front of hoodie only)
  if (sil.pocket && side === 'front') {
    const loop = [...sil.pocket, sil.pocket[0]];
    stroke(loop, groove, 0.006, undefined, 0.003);
    stroke(loop.map(([x, y]) => [x * 0.96, y * 0.98 + (y > -0.3 ? -0.004 : 0.006)] as Vec2), raised, 0.0022, [0.006, 0.004]);
  }

  return heightToNormal(features, size, heavy);
}

function ribBand(
  f: CanvasRenderingContext2D,
  P: (x: number, y: number) => [number, number],
  U: (n: number) => number,
  a: Vec2,
  b: Vec2,
  heavy: boolean,
) {
  const [x0, y0] = P(a[0], b[1]);
  const [x1, y1] = P(b[0], a[1]);
  const period = Math.max(3, U(heavy ? 0.009 : 0.007));
  f.save();
  f.fillStyle = 'rgb(0,180,0)';
  for (let x = x0; x < x1; x += period) f.fillRect(x, y0, period * 0.5, y1 - y0);
  f.restore();
}

function heightToNormal(features: HTMLCanvasElement, size: number, heavy: boolean): HTMLCanvasElement {
  const src = features.getContext('2d')!.getImageData(0, 0, size, size).data;
  const H = new Float32Array(size * size);
  const knitAmp = heavy ? 0.12 : 0.22;
  const wale = Math.max(2.4, size / 820);   // px per wale
  const course = wale * 0.78;
  let s = 42;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      s = (s * 1664525 + 1013904223) >>> 0;
      const noise = (s / 4294967296 - 0.5) * 0.18;
      // Jersey: vertical wales of stacked "V" loops.
      const w = Math.sin((x / wale) * Math.PI * 2);
      const c = Math.sin((y / course) * Math.PI * 2 + (x % (wale * 2) < wale ? 0 : Math.PI));
      const knit = (w * 0.65 + c * 0.35 + noise) * knitAmp;
      const grooveV = src[i * 4] / 255;
      const raisedV = src[i * 4 + 1] / 255;
      H[i] = knit - grooveV * 1.6 + raisedV * 0.9;
    }
  }

  const out = document.createElement('canvas');
  out.width = out.height = size;
  const octx = out.getContext('2d')!;
  const img = octx.createImageData(size, size);
  const d = img.data;
  const strength = size / 1024;
  for (let y = 0; y < size; y++) {
    const ym = y > 0 ? y - 1 : y;
    const yp = y < size - 1 ? y + 1 : y;
    for (let x = 0; x < size; x++) {
      const xm = x > 0 ? x - 1 : x;
      const xp = x < size - 1 ? x + 1 : x;
      const dhdu = (H[y * size + xp] - H[y * size + xm]) * 0.5;
      const dhdv = (H[ym * size + x] - H[yp * size + x]) * 0.5; // canvas rows run opposite to v
      let nx = -dhdu * strength;
      let ny = -dhdv * strength;
      let nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv;
      ny *= inv;
      nz *= inv;
      const o = (y * size + x) * 4;
      d[o] = (nx * 0.5 + 0.5) * 255;
      d[o + 1] = (ny * 0.5 + 0.5) * 255;
      d[o + 2] = (nz * 0.5 + 0.5) * 255;
      d[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/** Small tiling rib normal for collar, cords and hood rim */
export function buildRibTile(): HTMLCanvasElement {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = Math.cos((x / size) * Math.PI * 2 * 8) * 0.55;
      const inv = 1 / Math.hypot(nx, 1);
      const o = (y * size + x) * 4;
      img.data[o] = (nx * inv * 0.5 + 0.5) * 255;
      img.data[o + 1] = 128;
      img.data[o + 2] = (inv * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
