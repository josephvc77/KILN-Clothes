// ─────────────────────────────────────────────────────────────
// Screen prints, painted in garment units onto a canvas.
// Every print is original KILN artwork drawn procedurally —
// no image assets, infinitely sharp at any texture size.
// ─────────────────────────────────────────────────────────────

import type { PrintId } from '../../core/models/product';
import { toCanvas, unitsToPx } from './uv-frame';

type Ctx = CanvasRenderingContext2D;

interface PaintEnv {
  ctx: Ctx;
  size: number;
  ink: string;
  /** Garment-space anchor → canvas px */
  at: (x: number, y: number) => [number, number];
  /** Garment units → px */
  u: (n: number) => number;
}

const DISPLAY = 'Archivo, "Helvetica Neue", Arial, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

function condensedText(env: PaintEnv, text: string, x: number, y: number, sizeU: number, weight = 800, squeeze = 0.62, align: CanvasTextAlign = 'center', tracking = -0.01) {
  const { ctx, u } = env;
  const [px, py] = env.at(x, y);
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(squeeze, 1);
  ctx.font = `${weight} ${u(sizeU)}px ${DISPLAY}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${u(sizeU * tracking)}px`;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function monoText(env: PaintEnv, text: string, x: number, y: number, sizeU: number, align: CanvasTextAlign = 'center', tracking = 0.16) {
  const { ctx, u } = env;
  const [px, py] = env.at(x, y);
  ctx.save();
  ctx.font = `500 ${u(sizeU)}px ${MONO}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${u(sizeU * tracking)}px`;
  ctx.fillText(text, px, py);
  ctx.restore();
}

// ── Front prints ────────────────────────────────────────────

function wordmark(env: PaintEnv) {
  condensedText(env, 'KILN', 0, 0.26, 0.15, 850, 0.66, 'center', -0.02);
  monoText(env, 'FIRED, NOT MADE', 0, 0.215, 0.019);
}

function cone(env: PaintEnv) {
  // Pyrometric cone, slumped — the potter's thermometer. Left chest (viewer's right).
  const { ctx, u } = env;
  const cx = 0.2;
  const base = 0.3;
  const [bx, by] = env.at(cx, base);
  ctx.save();
  ctx.translate(bx, by);
  ctx.lineWidth = u(0.0045);
  ctx.strokeStyle = env.ink;
  ctx.lineJoin = 'round';
  // plaque
  ctx.beginPath();
  ctx.rect(-u(0.045), 0, u(0.09), u(0.012));
  ctx.fill();
  // three cones: standing, bending, slumped
  const cones: [number, number][] = [[-0.028, 0], [0, 0.55], [0.028, 1.35]];
  for (const [ox, bend] of cones) {
    ctx.save();
    ctx.translate(u(ox), 0);
    ctx.beginPath();
    ctx.moveTo(-u(0.008), 0);
    const tipX = Math.sin(bend) * u(0.06);
    const tipY = -Math.cos(bend) * u(0.06);
    ctx.quadraticCurveTo(-u(0.004) + tipX * 0.3, tipY * 0.6, tipX, tipY);
    ctx.quadraticCurveTo(u(0.004) + tipX * 0.35, tipY * 0.45, u(0.008), 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  monoText(env, 'CONE 10', cx, base - 0.036, 0.016);
  monoText(env, '1260°C', cx, base - 0.058, 0.013);
}

function seal(env: PaintEnv) {
  const { ctx, u } = env;
  const [cx, cy] = env.at(0, 0.3);
  const r = u(0.085);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = env.ink;
  ctx.lineWidth = u(0.004);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = u(0.002);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  ctx.stroke();

  // text on circle
  const text = 'KILN · FIRED NOT MADE · HEAVYWEIGHT · ';
  ctx.font = `500 ${u(0.0155)}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...text];
  const step = (Math.PI * 2) / chars.length;
  chars.forEach((ch, i) => {
    ctx.save();
    ctx.rotate(i * step - Math.PI / 2);
    ctx.translate(0, -r * 0.83);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  // centre flame / kiln mouth glyph
  ctx.beginPath();
  const s = r * 0.38;
  ctx.moveTo(-s, s * 0.7);
  ctx.lineTo(-s, -s * 0.1);
  ctx.quadraticCurveTo(-s, -s, 0, -s);
  ctx.quadraticCurveTo(s, -s, s, -s * 0.1);
  ctx.lineTo(s, s * 0.7);
  ctx.closePath();
  ctx.fillStyle = env.ink;
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(-s * 0.45, s * 0.7);
  ctx.lineTo(-s * 0.45, s * 0.05);
  ctx.quadraticCurveTo(-s * 0.45, -s * 0.45, 0, -s * 0.45);
  ctx.quadraticCurveTo(s * 0.45, -s * 0.45, s * 0.45, s * 0.05);
  ctx.lineTo(s * 0.45, s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Back prints ─────────────────────────────────────────────

function firingChart(env: PaintEnv) {
  const { ctx, u } = env;
  condensedText(env, 'FIRING', 0, 0.36, 0.13, 850, 0.6);
  condensedText(env, '04', 0, 0.2, 0.19, 850, 0.6);

  // Kiln schedule curve: ramp, candle, ramp, hold at peak, cool.
  const x0 = -0.24, x1 = 0.24, y0 = -0.14, y1 = 0.12;
  const [ax, ay] = env.at(x0, y0);
  const [bx, by] = env.at(x1, y1);
  ctx.save();
  ctx.strokeStyle = env.ink;
  ctx.fillStyle = env.ink;
  ctx.lineWidth = u(0.0022);
  // grid
  ctx.globalAlpha = 0.45;
  for (let i = 0; i <= 6; i++) {
    const gx = ax + ((bx - ax) * i) / 6;
    ctx.beginPath();
    ctx.moveTo(gx, ay);
    ctx.lineTo(gx, by);
    ctx.stroke();
  }
  for (let i = 0; i <= 4; i++) {
    const gy = ay + ((by - ay) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(ax, gy);
    ctx.lineTo(bx, gy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // curve
  const pts: [number, number][] = [[0, 0.02], [0.12, 0.2], [0.24, 0.24], [0.52, 0.86], [0.66, 0.97], [0.72, 0.97], [1, 0.3]];
  ctx.lineWidth = u(0.008);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([t, v], i) => {
    const px = ax + (bx - ax) * t;
    const py = ay + (by - ay) * v;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  });
  ctx.stroke();
  // peak marker
  const pk = pts[4];
  ctx.beginPath();
  ctx.arc(ax + (bx - ax) * pk[0], ay + (by - ay) * pk[1], u(0.011), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  monoText(env, '1260°C  HOLD 20 MIN', 0.24, y1 + 0.02, 0.015, 'right');
  monoText(env, 'CANDLE · RAMP · SOAK · COOL', x0, y0 - 0.03, 0.015, 'left');
  monoText(env, 'KILN — HEAVYWEIGHT GARMENTS', 0, -0.25, 0.017);
}

function glazeRings(env: PaintEnv) {
  const { ctx, u } = env;
  const [cx, cy] = env.at(0, 0.18);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = env.ink;
  ctx.fillStyle = env.ink;
  const rings = [0.2, 0.175, 0.15, 0.118, 0.09, 0.062, 0.036];
  const widths = [0.004, 0.012, 0.003, 0.02, 0.005, 0.014, 0.004];
  rings.forEach((r, i) => {
    ctx.lineWidth = u(widths[i]);
    ctx.beginPath();
    // Hand-thrown wobble
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      const rr = u(r) * (1 + 0.012 * Math.sin(t * 3 + i) + 0.006 * Math.sin(t * 7 - i));
      const x = Math.cos(t) * rr;
      const y = Math.sin(t) * rr;
      if (a) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.arc(0, 0, u(0.014), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  monoText(env, 'GLAZE TEST — SERIES 04', 0, -0.07, 0.017);
  condensedText(env, 'KILN', 0, -0.16, 0.08, 850, 0.66);
}

const PAINTERS: Record<PrintId, ((env: PaintEnv) => void) | null> = {
  none: null,
  wordmark,
  cone,
  seal,
  firing: firingChart,
  glaze: glazeRings,
};

/**
 * Paint a print onto a scratch canvas, distress it like a worn
 * discharge print, then composite onto the fabric canvas.
 */
export function paintPrint(target: Ctx, size: number, id: PrintId, ink: string, seed = 1): void {
  const painter = PAINTERS[id];
  if (!painter) return;
  const scratch = document.createElement('canvas');
  scratch.width = scratch.height = size;
  const ctx = scratch.getContext('2d')!;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  painter({ ctx, size, ink, at: (x, y) => toCanvas(x, y, size), u: (n) => unitsToPx(n, size) });

  // Distress: knock out tiny specks so the ink sits "in" the fabric.
  ctx.globalCompositeOperation = 'destination-out';
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const specks = Math.round((size * size) / 900);
  const px = Math.max(1, size / 1024);
  for (let i = 0; i < specks; i++) {
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.fillRect(rand() * size, rand() * size, px * (1 + rand() * 1.6), px * (1 + rand()));
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  target.save();
  target.globalAlpha = 0.93;
  target.drawImage(scratch, 0, 0);
  target.restore();
}

/** Fonts must be ready before painting, or the canvas falls back silently. */
let fontsReady: Promise<void> | null = null;
export function ensurePrintFonts(): Promise<void> {
  if (!fontsReady) {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fontsReady = fonts
      ? Promise.race([
          Promise.all([fonts.load(`850 64px ${DISPLAY}`), fonts.load(`500 32px ${MONO}`)]).then(() => undefined),
          new Promise<void>((r) => setTimeout(r, 2500)),
        ]).catch(() => undefined)
      : Promise.resolve();
  }
  return fontsReady;
}
