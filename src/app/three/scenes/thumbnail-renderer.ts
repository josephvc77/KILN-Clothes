// ─────────────────────────────────────────────────────────────
// Product "photography" rendered with the same garment engine.
// One off-screen renderer renders a queue of specs to image blobs,
// then releases its GL context. Cards, cart and search reuse them.
// ─────────────────────────────────────────────────────────────

import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  SpotLight,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { GarmentSpec } from '../../core/models/product';
import { Garment, GARMENT_QUALITY } from '../garment/garment';

export interface ThumbRequest {
  key: string;
  spec: GarmentSpec;
  view: 'front' | 'back' | 'angle';
}

export class ThumbnailRenderer {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(28, 4 / 5, 0.1, 20);

  constructor(width = 640, height = 800) {
    const canvas = document.createElement('canvas');
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(0, 0);

    const pmrem = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.6;
    room.dispose();
    pmrem.dispose();

    const key = new SpotLight('#fff1e2', 30, 12, Math.PI / 5, 0.8, 1.6);
    key.position.set(-2.4, 3, 3.6);
    const fill = new HemisphereLight('#fff7ee', '#6b5f52', 1.2);
    const rim = new DirectionalLight('#ffd9c0', 1.4);
    rim.position.set(2.5, 1.5, -2.5);
    this.scene.add(key, fill, rim);
    this.camera.position.set(0, 0.0, 3.95);
    this.camera.lookAt(0, -0.02, 0);
  }

  async render(req: ThumbRequest): Promise<Blob | null> {
    const garment = await Garment.create(req.spec, GARMENT_QUALITY.medium);
    const g = garment.group;
    g.rotation.y = req.view === 'back' ? Math.PI : req.view === 'angle' ? -0.42 : -0.12;
    g.rotation.z = req.view === 'angle' ? 0.02 : 0;
    this.scene.add(g);
    this.renderer.render(this.scene, this.camera);
    const blob = await new Promise<Blob | null>((resolve) =>
      (this.renderer.domElement as HTMLCanvasElement).toBlob((b) => resolve(b), 'image/webp', 0.9),
    );
    this.scene.remove(g);
    garment.dispose();
    return blob;
  }

  dispose(): void {
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
