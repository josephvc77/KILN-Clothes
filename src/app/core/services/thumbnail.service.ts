import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import type { GarmentSpec } from '../models/product';
import { DeviceService } from './device.service';

type View = 'front' | 'back' | 'angle';

interface Job {
  key: string;
  spec: GarmentSpec;
  view: View;
  priority: number;
}

/**
 * Renders product imagery on the client with the garment engine,
 * so every colourway × print combination gets a consistent studio
 * shot with no image assets. Lazy: Three.js loads on first request.
 */
@Injectable({ providedIn: 'root' })
export class ThumbnailService {
  private readonly device = inject(DeviceService);
  private readonly urls = signal<Record<string, string>>({});
  private readonly queue: Job[] = [];
  private readonly queued = new Set<string>();
  private running = false;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private renderer: import('../../three/scenes/thumbnail-renderer').ThumbnailRenderer | null = null;

  keyOf(spec: GarmentSpec, view: View): string {
    return `${spec.kind}:${spec.colorway.id}:${view === 'back' ? spec.back : spec.front}:${view}`;
  }

  /** Returns a signal that resolves to an object URL once rendered (null until then / if 3D unavailable). */
  request(spec: GarmentSpec, view: View = 'front', priority = 0): Signal<string | null> {
    const key = this.keyOf(spec, view);
    if (this.device.can3D() && !this.urls()[key] && !this.queued.has(key)) {
      this.queued.add(key);
      this.queue.push({ key, spec, view, priority });
      this.pump();
    }
    return computed(() => this.urls()[key] ?? null);
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    if (this.releaseTimer) clearTimeout(this.releaseTimer);
    try {
      await idle();
      if (!this.renderer) {
        const { ThumbnailRenderer } = await import('../../three/scenes/thumbnail-renderer');
        this.renderer = new ThumbnailRenderer();
      }
      while (this.queue.length) {
        this.queue.sort((a, b) => b.priority - a.priority);
        const job = this.queue.shift()!;
        const blob = await this.renderer.render({ key: job.key, spec: job.spec, view: job.view });
        if (blob) {
          const url = URL.createObjectURL(blob);
          this.urls.update((m) => ({ ...m, [job.key]: url }));
        }
        await idle();
      }
    } catch (err) {
      console.warn('[kiln] thumbnail rendering unavailable, using illustrated fallback', err);
      this.device.threeDisabled.set(true);
    } finally {
      this.running = false;
      // Release the GL context when idle; recreate on demand.
      this.releaseTimer = setTimeout(() => {
        if (!this.running) {
          this.renderer?.dispose();
          this.renderer = null;
        }
      }, 4000);
    }
  }
}

const idle = () =>
  new Promise<void>((r) =>
    'requestIdleCallback' in window ? window.requestIdleCallback(() => r(), { timeout: 400 }) : setTimeout(r, 16),
  );
