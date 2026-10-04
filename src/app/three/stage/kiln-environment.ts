// ─────────────────────────────────────────────────────────────
// The kiln chamber: warm up-light from the embers below, a cool
// rim from behind, a glazed ceramic plinth with a heating-element
// ring, contact shadow, and rising embers that cool to ash.
// `heat` (0..1) and `cool` (0..1 → bone studio) drive everything.
// ─────────────────────────────────────────────────────────────

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  ShaderMaterial,
  SpotLight,
  TorusGeometry,
} from 'three';
import type { Tier } from './stage';

const EMBER_COUNT: Record<Tier, number> = { high: 520, medium: 240, low: 90 };

export class KilnEnvironment {
  readonly group = new Group();
  readonly plinthTop: number;
  private readonly key: SpotLight;
  private readonly ember: PointLight;
  private readonly rim: DirectionalLight;
  private readonly hemi: HemisphereLight;
  private readonly glaze: MeshPhysicalMaterial;
  private readonly ringMat: MeshBasicMaterial;
  private readonly shadowMat: MeshBasicMaterial;
  private readonly embers: Points;
  private readonly emberMat: ShaderMaterial;
  private readonly soot = new Color('#1d1a17');
  private readonly bone = new Color('#e9e1d4');

  heat = 0.6;
  cool = 0;
  /** Reduced motion: embers barely drift instead of rising. */
  private readonly timeScale: number;

  constructor(tier: Tier, reducedMotion: boolean, plinthY = -0.86) {
    this.plinthTop = plinthY;
    this.timeScale = reducedMotion ? 0.08 : 1;

    this.hemi = new HemisphereLight('#4a3326', '#0b0806', 0.5);
    this.key = new SpotLight('#fff3e8', 30, 14, Math.PI / 5, 0.7, 1.5);
    this.key.position.set(-2.2, 3.2, 3.4);
    this.key.target.position.set(0, -0.1, 0);
    this.ember = new PointLight('#ff5a1f', 6, 6, 1.7);
    this.ember.position.set(0.2, plinthY - 0.2, 1.2);
    this.rim = new DirectionalLight('#cfd8ff', 1.6);
    this.rim.position.set(2.4, 1.6, -3);
    this.group.add(this.hemi, this.key, this.key.target, this.ember, this.rim);

    // Plinth — glazed stoneware
    this.glaze = new MeshPhysicalMaterial({
      color: this.soot,
      roughness: 0.34,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 0.9,
    });
    const segs = tier === 'low' ? 48 : 128;
    const plinth = new Mesh(new CylinderGeometry(0.86, 0.9, 0.16, segs, 1), this.glaze);
    plinth.position.y = plinthY - 0.08;
    this.group.add(plinth);

    // Heating element ring
    this.ringMat = new MeshBasicMaterial({ color: '#ff5a1f', transparent: true, opacity: 0.9, toneMapped: false });
    const ring = new Mesh(new TorusGeometry(0.875, 0.0045, 8, segs), this.ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = plinthY + 0.002;
    this.group.add(ring);

    // Contact shadow
    this.shadowMat = new MeshBasicMaterial({ map: radialTexture('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false });
    const shadow = new Mesh(new PlaneGeometry(1.7, 0.9), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = plinthY + 0.003;
    this.group.add(shadow);

    // Embers
    const count = reducedMotion ? Math.round(EMBER_COUNT[tier] * 0.35) : EMBER_COUNT[tier];
    const geo = new BufferGeometry();
    const seeds = new Float32Array(count * 4);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.25 + Math.pow(Math.random(), 0.7) * 2.2;
      seeds[i * 4] = Math.cos(a) * r;
      seeds[i * 4 + 1] = Math.sin(a) * r * 0.7 - 0.4;
      seeds[i * 4 + 2] = 0.08 + Math.random() * 0.22;
      seeds[i * 4 + 3] = Math.random();
    }
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    this.emberMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      premultipliedAlpha: true,
      uniforms: {
        uTime: { value: 0 },
        uHeat: { value: this.heat },
        uCool: { value: 0 },
        uPixel: { value: Math.min(window.devicePixelRatio, 2) },
        uBase: { value: plinthY },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        uniform float uTime;
        uniform float uHeat;
        uniform float uPixel;
        uniform float uBase;
        varying float vLife;
        varying float vSeed;
        void main() {
          float speed = aSeed.z * (0.6 + uHeat * 1.2);
          float life = fract(aSeed.w + uTime * speed * 0.18);
          vec3 p;
          p.x = aSeed.x + sin(uTime * 0.7 + aSeed.w * 30.0) * 0.08 * life;
          p.z = aSeed.y + cos(uTime * 0.5 + aSeed.w * 20.0) * 0.06 * life;
          p.y = uBase + life * 3.4;
          vLife = life;
          vSeed = aSeed.w;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float size = (0.35 + fract(aSeed.w * 13.7) * 0.9) * (1.0 - life * 0.55);
          gl_PointSize = size * uPixel * 26.0 / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uHeat;
        uniform float uCool;
        varying float vLife;
        varying float vSeed;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          // hot orange at birth → ash grey as it rises and cools
          vec3 hot = mix(vec3(1.0, 0.36, 0.1), vec3(1.0, 0.72, 0.4), fract(vSeed * 7.0));
          vec3 ash = vec3(0.42, 0.39, 0.36);
          float cooling = smoothstep(0.15, 0.75, vLife);
          vec3 col = mix(hot * (1.2 + uHeat), ash * 0.6, cooling);
          float fade = smoothstep(0.0, 0.08, vLife) * (1.0 - smoothstep(0.7, 1.0, vLife));
          float flicker = 0.75 + 0.25 * sin(vSeed * 90.0 + vLife * 40.0);
          float alpha = a * fade * (0.55 + uHeat * 0.45) * (1.0 - uCool);
          gl_FragColor = vec4(col * flicker * alpha, alpha);
        }`,
    });
    this.embers = new Points(geo, this.emberMat);
    this.embers.frustumCulled = false;
    this.group.add(this.embers);
  }

  /** Shadow tightens and darkens as the garment gets closer to the plinth */
  setShadow(garmentBottomY: number): void {
    const gap = Math.max(0, garmentBottomY - this.plinthTop);
    this.shadowMat.opacity = Math.max(0.15, 0.9 - gap * 1.6) * (1 - this.cool * 0.55);
  }

  update(time: number): void {
    const h = this.heat;
    const c = this.cool;
    this.emberMat.uniforms['uTime'].value = time * this.timeScale;
    this.emberMat.uniforms['uHeat'].value = h;
    this.emberMat.uniforms['uCool'].value = c;
    this.embers.visible = c < 0.98;

    const flicker = 1 + Math.sin(time * 7.3) * 0.04 * h + Math.sin(time * 13.1) * 0.03 * h;
    this.ember.intensity = (0.8 + h * 4.5) * flicker * (1 - c);
    this.ringMat.opacity = (0.25 + h * 0.75) * (1 - c);
    this.ringMat.color.setRGB(1, 0.3 + h * 0.2, 0.08);

    // Cooling: kiln → daylight studio
    this.glaze.color.copy(this.soot).lerp(this.bone, c);
    this.glaze.roughness = 0.34 - c * 0.12;
    this.hemi.color.set('#4a3326').lerp(new Color('#fff6ea'), c);
    this.hemi.groundColor.set('#0b0806').lerp(new Color('#c9bfb0'), c);
    this.hemi.intensity = 0.5 + c * 0.75;
    this.key.intensity = 30 + c * 4;
    this.rim.intensity = 1.6 - c * 0.8;
  }

  dispose(): void {
    this.shadowMat.map?.dispose();
  }
}

function radialTexture(inner: string, outer: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

