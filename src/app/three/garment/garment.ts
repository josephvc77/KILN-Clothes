// ─────────────────────────────────────────────────────────────
// Garment: assembles body sheets, trims (collar, hood, pocket,
// drawcords) and PBR fabric materials for a product spec.
// Owns every GPU resource it creates and releases them in dispose().
// ─────────────────────────────────────────────────────────────

import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LinearSRGBColorSpace,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TubeGeometry,
  Vector2,
  Vector3,
  BufferGeometry,
  Material,
} from 'three';
import type { Colorway, GarmentSpec, PrintId } from '../../core/models/product';
import { Silhouette, backNeckY, frontNeckY, silhouetteFor } from './silhouettes';
import { HeightFn, MeshQuality, bodyHeight, hoodHeight, inflate, neckCut, neckCutPoints, pocketHeight, surfacePoint } from './garment-geometry';
import { buildNormalCanvas, buildRibTile, paintFabric } from './fabric-textures';
import { DissolveUniforms, applyEmberDissolve, createDissolveUniforms } from './ember-dissolve';
import { ensurePrintFonts } from './prints';

export interface GarmentQuality extends MeshQuality {
  texSize: number;
  normalSize: number;
  tubeSegments: number;
}

export const GARMENT_QUALITY: Record<'high' | 'medium' | 'low', GarmentQuality> = {
  high: { step: 0.016, edgeStep: 0.009, texSize: 2048, normalSize: 2048, tubeSegments: 96 },
  medium: { step: 0.022, edgeStep: 0.012, texSize: 1024, normalSize: 1024, tubeSegments: 64 },
  low: { step: 0.032, edgeStep: 0.018, texSize: 1024, normalSize: 512, tubeSegments: 40 },
};

// Normal maps depend only on (kind, side, size) — share them between garments.
const normalCache = new Map<string, { canvas: HTMLCanvasElement; users: number; texture?: Texture }>();

export class Garment {
  readonly group = new Group();
  /** Meshes live here in raw garment units; normalised into `group`. */
  private readonly content = new Group();
  readonly silhouette: Silhouette;
  readonly dissolve: DissolveUniforms;
  readonly height: HeightFn;

  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Material[] = [];
  private readonly textures: Texture[] = [];
  private readonly normalKeys: string[] = [];

  private readonly frontCanvas: HTMLCanvasElement;
  private readonly backCanvas: HTMLCanvasElement;
  private readonly frontMap: CanvasTexture;
  private readonly backMap: CanvasTexture;
  private readonly fabricFront: MeshPhysicalMaterial;
  private readonly fabricBack: MeshPhysicalMaterial;
  private readonly trim: MeshPhysicalMaterial;
  private readonly lining: MeshPhysicalMaterial;

  private spec: GarmentSpec;

  static async create(spec: GarmentSpec, quality: GarmentQuality, uniforms?: DissolveUniforms): Promise<Garment> {
    await ensurePrintFonts();
    return new Garment(spec, quality, uniforms);
  }

  private constructor(spec: GarmentSpec, private readonly quality: GarmentQuality, uniforms?: DissolveUniforms) {
    this.spec = spec;
    this.silhouette = silhouetteFor(spec.kind);
    this.dissolve = uniforms ?? createDissolveUniforms();
    const heavy = spec.kind === 'crew' || spec.kind === 'hoodie';
    const { fn } = bodyHeight(this.silhouette, heavy);
    this.height = fn;

    // ── Textures ──
    this.frontCanvas = this.canvas(quality.texSize);
    this.backCanvas = this.canvas(quality.texSize);
    this.frontMap = this.track(new CanvasTexture(this.frontCanvas));
    this.backMap = this.track(new CanvasTexture(this.backCanvas));
    for (const t of [this.frontMap, this.backMap]) {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
    }
    const nFront = this.normal(spec.kind, 'front', heavy);
    const nBack = this.normal(spec.kind, 'back', heavy);
    const ribTile = this.track(new CanvasTexture(buildRibTile()));
    ribTile.wrapS = ribTile.wrapT = RepeatWrapping;
    ribTile.colorSpace = LinearSRGBColorSpace;
    ribTile.repeat.set(36, 1);

    // ── Materials: cotton = rough dielectric + sheen for the fuzz ──
    const fabric = (map: Texture, normalMap: Texture) =>
      this.mat(
        new MeshPhysicalMaterial({
          map,
          normalMap,
          normalScale: new Vector2(0.55, 0.55),
          roughness: 0.94,
          metalness: 0,
          sheen: 1,
          sheenRoughness: 0.55,
          side: DoubleSide,
          envMapIntensity: 0.55,
        }),
      );
    this.fabricFront = fabric(this.frontMap, nFront);
    this.fabricBack = fabric(this.backMap, nBack);
    this.trim = this.mat(
      new MeshPhysicalMaterial({ normalMap: ribTile, normalScale: new Vector2(0.8, 0.8), roughness: 0.95, sheen: 1, sheenRoughness: 0.5, envMapIntensity: 0.5 }),
    );
    this.lining = this.mat(new MeshPhysicalMaterial({ roughness: 1, sheen: 0.6, sheenRoughness: 0.8, side: DoubleSide, envMapIntensity: 0.3 }));

    // ── Body ──
    const body = new Mesh(
      this.geo(
        inflate({
          outline: this.silhouette.outline,
          quality,
          height: this.height,
          frontCut: neckCut(this.silhouette),
          extraPoints: neckCutPoints(this.silhouette, quality.step),
        }),
      ),
      [this.fabricFront, this.fabricBack],
    );
    body.name = 'body';
    this.content.add(body);

    this.addCollar();
    if (this.silhouette.hood) this.addHood();
    if (this.silhouette.pocket) this.addPocket();
    if (spec.kind === 'hoodie') this.addCords();

    this.applyColorway(spec.colorway);
    this.paint();
    this.normalise();
  }

  /** Fit every product into the same presentation frame (~1.3 tall, centred). */
  private normalise() {
    const b = this.silhouette.bounds;
    const top = this.silhouette.hood ? Math.max(b.maxY, ...this.silhouette.hood.map(([, y]) => y)) : b.maxY;
    const w = b.maxX - b.minX;
    const h = top - b.minY;
    const s = Math.min(1.34 / h, 1.5 / w);
    this.content.scale.setScalar(s);
    this.content.position.y = -((top + b.minY) / 2) * s - 0.02;
    this.group.add(this.content);
  }

  get current(): GarmentSpec {
    return this.spec;
  }

  setColorway(colorway: Colorway): void {
    if (colorway.id === this.spec.colorway.id) return;
    this.spec = { ...this.spec, colorway };
    this.applyColorway(colorway);
    this.paint();
  }

  setPrints(front: PrintId, back: PrintId): void {
    if (front === this.spec.front && back === this.spec.back) return;
    const repaintFront = front !== this.spec.front;
    const repaintBack = back !== this.spec.back;
    this.spec = { ...this.spec, front, back };
    this.paint(repaintFront, repaintBack);
  }

  /** Garment-space hotspot → local 3D point slightly off the surface */
  surface(x: number, y: number, side: 'front' | 'back', lift = 0.015): Vector3 {
    const s = side === 'front' ? 1 : -1;
    const p = surfacePoint(this.silhouette, this.height, x, y, s);
    p.z += lift * s;
    return p.multiplyScalar(this.content.scale.x).add(this.content.position);
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    for (const key of this.normalKeys) {
      const entry = normalCache.get(key);
      if (entry && --entry.users <= 0) {
        entry.texture?.dispose();
        normalCache.delete(key);
      }
    }
    this.content.clear();
    this.group.clear();
  }

  // ── Construction helpers ─────────────────────────────────

  private applyColorway(c: Colorway) {
    const base = new Color(c.fabric);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    // Cotton fuzz scatters a slightly lighter, desaturated tint — too bright and dark dyes turn chalky.
    const sheen = new Color().setHSL(hsl.h, hsl.s * 0.6, Math.min(0.8, hsl.l * 1.25 + 0.08));
    for (const m of [this.fabricFront, this.fabricBack]) {
      m.sheenColor.copy(sheen);
    }
    this.trim.color.copy(base).multiplyScalar(0.92);
    this.trim.sheenColor.copy(sheen);
    this.lining.color.copy(base).multiplyScalar(0.55);
    this.lining.sheenColor.copy(sheen).multiplyScalar(0.5);
  }

  private paint(front = true, back = true) {
    if (front) {
      paintFabric(this.frontCanvas, this.spec.colorway, this.spec.front, 'front');
      this.frontMap.needsUpdate = true;
    }
    if (back) {
      paintFabric(this.backCanvas, this.spec.colorway, this.spec.back, 'back');
      this.backMap.needsUpdate = true;
    }
  }

  private addCollar() {
    const sil = this.silhouette;
    const hw = sil.neck.halfWidth;
    const segs = this.quality.tubeSegments;
    const rib = sil.kind === 'hoodie' ? 0.012 : 0.017;

    // Front collar follows the neck cut ON the surface
    const frontPts: Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const x = -hw * 1.02 + (2.04 * hw * i) / 24;
      const y = frontNeckY(sil.neck, Math.min(Math.abs(x), hw)) + 0.004;
      const p = surfacePoint(sil, this.height, x, y - 0.006, 1);
      p.z = Math.max(p.z * 0.92, 0.006);
      frontPts.push(p);
    }
    const front = new Mesh(this.geo(new TubeGeometry(new CatmullRomCurve3(frontPts), segs, rib, 10, false)), this.trim);

    // Back collar sits on the outline, curling slightly inward
    const backPts: Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const x = -hw + (2 * hw * i) / 20;
      backPts.push(new Vector3(x, backNeckY(sil.neck, x) - 0.008, -0.012));
    }
    const back = new Mesh(this.geo(new TubeGeometry(new CatmullRomCurve3(backPts), segs, rib * 0.95, 10, false)), this.trim);
    this.content.add(front, back);
  }

  private addHood() {
    const sil = this.silhouette;
    const geo = this.geo(
      inflate({
        outline: sil.hood!,
        quality: { step: this.quality.step * 1.2, edgeStep: this.quality.edgeStep },
        height: hoodHeight(0.2, 0.1),
        mirrorBackUV: true,
      }),
    );
    // Front sheet is the dished lining (pushed backwards), back sheet the shell.
    const pos = geo.getAttribute('position');
    const groups = geo.groups;
    const index = geo.getIndex()!;
    const frontVerts = new Set<number>();
    for (let i = groups[0].start; i < groups[0].start + groups[0].count; i++) frontVerts.add(index.getX(i));
    for (const v of frontVerts) pos.setZ(v, -pos.getZ(v) * 0.9);
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const hood = new Mesh(geo, [this.lining, this.fabricBack]);
    hood.position.z = -0.05;
    hood.name = 'hood';

    // Rim: rolled edge around the opening
    const rimPts: Vector3[] = [];
    const outline = sil.hood!;
    const top = outline.filter(([, y]) => y > 0.5);
    const sorted = top.slice().sort((a, b) => Math.atan2(a[0], a[1] - 0.6) - Math.atan2(b[0], b[1] - 0.6));
    for (const [x, y] of sorted.filter((_, i) => i % 2 === 0)) rimPts.push(new Vector3(x * 0.985, y - 0.004, -0.045));
    if (rimPts.length > 3) {
      const rim = new Mesh(this.geo(new TubeGeometry(new CatmullRomCurve3(rimPts), this.quality.tubeSegments, 0.016, 10, false)), this.trim);
      this.content.add(rim);
    }
    this.content.add(hood);
  }

  private addPocket() {
    const sil = this.silhouette;
    const geo = this.geo(
      inflate({ outline: sil.pocket!, quality: { step: this.quality.step, edgeStep: this.quality.edgeStep }, height: pocketHeight() }),
    );
    // Only keep the front sheet, lifted onto the body surface.
    const pos = geo.getAttribute('position');
    const tmp = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const base = surfacePoint(sil, this.height, x, y, 1, tmp).z;
      pos.setZ(i, base + Math.max(0, pos.getZ(i)) + 0.0015);
    }
    geo.groups.splice(1);
    geo.computeVertexNormals();
    const pocket = new Mesh(geo, [this.fabricFront]);
    pocket.name = 'pocket';
    this.content.add(pocket);
  }

  private addCords() {
    const sil = this.silhouette;
    const aglet = this.mat(new MeshStandardMaterial({ color: '#b9b4ab', metalness: 1, roughness: 0.32 }));
    const agletGeo = this.geo(new CylinderGeometry(0.0085, 0.0085, 0.05, 12));
    for (const sx of [-1, 1]) {
      const x0 = sx * 0.055;
      const top = surfacePoint(sil, this.height, x0, frontNeckY(sil.neck, x0) - 0.01, 1);
      const pts: Vector3[] = [top.clone().add(new Vector3(0, 0, 0.01))];
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const x = x0 + sx * Math.sin(t * 2.2) * 0.018;
        const y = top.y - t * 0.3;
        const p = surfacePoint(sil, this.height, x, y, 1);
        p.z += 0.014 + Math.sin(t * Math.PI) * 0.01;
        pts.push(p);
      }
      const cord = new Mesh(this.geo(new TubeGeometry(new CatmullRomCurve3(pts), 48, 0.0065, 6, false)), this.trim);
      const tip = new Mesh(agletGeo, aglet);
      const end = pts[pts.length - 1];
      tip.position.copy(end).add(new Vector3(0, -0.024, 0.002));
      this.content.add(cord, tip);
    }
  }


  private normal(kind: string, side: 'front' | 'back', heavy: boolean): Texture {
    const key = `${kind}:${side}:${this.quality.normalSize}`;
    let entry = normalCache.get(key);
    if (!entry) {
      entry = { canvas: buildNormalCanvas(this.silhouette, { size: this.quality.normalSize, heavy, side }), users: 0 };
      normalCache.set(key, entry);
    }
    if (!entry.texture) {
      const t = new CanvasTexture(entry.canvas);
      t.colorSpace = LinearSRGBColorSpace;
      t.anisotropy = 4;
      entry.texture = t;
    }
    entry.users++;
    this.normalKeys.push(key);
    return entry.texture;
  }

  private canvas(size: number) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  private geo<T extends BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private mat<T extends Material>(m: T): T {
    this.materials.push(m);
    applyEmberDissolve(m, this.dissolve);
    return m;
  }

  private track<T extends Texture>(t: T): T {
    this.textures.push(t);
    return t;
  }
}
