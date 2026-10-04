import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { GarmentSpec } from '../../core/models/product';
import { ThumbnailService } from '../../core/services/thumbnail.service';
import { silhouetteFor, toSvgPath } from '../../three/garment/silhouettes';

/**
 * Product image. Shows an illustrated silhouette instantly (also the
 * WebGL fallback), then crossfades to the engine-rendered studio shot.
 */
@Component({
  selector: 'k-garment-image',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="illus" [attr.viewBox]="viewBox" aria-hidden="true" [class.is-hidden]="!!src()">
      <defs>
        <linearGradient [attr.id]="gid + 'shade'" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="0.16" />
          <stop offset="0.55" stop-color="#fff" stop-opacity="0" />
          <stop offset="1" stop-color="#000" stop-opacity="0.28" />
        </linearGradient>
      </defs>
      @if (hood()) {
        <path [attr.d]="hood()" [attr.fill]="shadeFill()" transform="translate(0 0)" />
      }
      <path [attr.d]="body()" [attr.fill]="spec().colorway.swatch" />
      <path [attr.d]="body()" [attr.fill]="'url(#' + gid + 'shade)'" />
    </svg>
    @if (src(); as s) {
      <img [src]="s" [alt]="alt()" loading="lazy" decoding="async" draggable="false" />
    } @else {
      <span class="visually-hidden">{{ alt() }}</span>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
    }
    .illus,
    img {
      grid-area: 1 / 1;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .illus {
      padding: 12%;
      transition: opacity 600ms var(--ease-out);
      filter: drop-shadow(0 24px 30px rgba(0, 0, 0, 0.35));
    }
    .illus.is-hidden {
      opacity: 0;
    }
    img {
      animation: in 700ms var(--ease-out) both;
      user-select: none;
    }
    @keyframes in {
      from { opacity: 0; transform: scale(0.985); }
    }
  `,
})
export class GarmentImageComponent {
  private readonly thumbs = inject(ThumbnailService);

  readonly spec = input.required<GarmentSpec>();
  readonly view = input<'front' | 'back' | 'angle'>('front');
  readonly priority = input(0);
  readonly alt = input('');

  protected readonly gid = `g${Math.random().toString(36).slice(2, 8)}`;
  protected readonly viewBox = '-0.95 -1.0 1.9 1.72';

  private readonly sil = computed(() => silhouetteFor(this.spec().kind));
  protected readonly body = computed(() => toSvgPath(this.sil().outline));
  protected readonly hood = computed(() => {
    const h = this.sil().hood;
    return h ? toSvgPath(h) : null;
  });
  protected readonly shadeFill = computed(() => shade(this.spec().colorway.swatch, 0.7));

  protected readonly src = computed(() => this.thumbs.request(this.spec(), this.view(), this.priority())());
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}
