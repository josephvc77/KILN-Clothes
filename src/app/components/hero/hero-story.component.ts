import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  isDevMode,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Colorway, GarmentSpec, Size } from '../../core/models/product';
import { CatalogService } from '../../core/services/catalog.service';
import { CartStore } from '../../core/services/cart.store';
import { DeviceService } from '../../core/services/device.service';
import { UiStore } from '../../core/services/ui.store';
import { loadMotion } from '../../motion/gsap';
import type { StoryScene, StoryState } from '../../three/scenes/story-scene';
import { GarmentImageComponent } from '../garment-image/garment-image.component';
import { ColorwayPickerComponent } from '../ui/colorway-picker.component';
import { SizePickerComponent, SizeOption } from '../ui/size-picker.component';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { PricePipe } from '../../shared/pipes/price.pipe';

type Chapter = 'hero' | 'raw' | 'fired' | 'glaze' | 'worn' | 'cooled';

const CHAPTERS: Chapter[] = ['hero', 'raw', 'fired', 'glaze', 'worn', 'cooled'];
const TAU = Math.PI * 2;

/** Camera/scene keyframes. Desktop composes around side copy; mobile keeps the garment centred. */
function keyframes(mobile: boolean): Record<Chapter, Partial<StoryState>> {
  const o = mobile ? 0 : 1;
  return {
    hero: { camX: 0, camY: 0.12, camZ: mobile ? 4.3 : 4.7, lookX: 0, lookY: mobile ? -0.62 : -0.22, rotY: 0, mix: 0, heat: 0.65, cool: 0, float: 1, offsetX: 0 },
    raw: { camX: 0.1 * o, camY: 0.34, camZ: mobile ? 2.2 : 2.05, lookX: -0.16 * o, lookY: mobile ? -0.1 : 0.24, rotY: -0.38, mix: 0, heat: 0.4, cool: 0, float: 0.25, offsetX: 0.34 * o },
    fired: { camX: 0, camY: 0.1, camZ: mobile ? 4.1 : 3.7, lookX: 0, lookY: mobile ? -0.7 : 0, rotY: Math.PI, mix: 0, heat: 1, cool: 0, float: 0.6, offsetX: 0.42 * o },
    glaze: { camX: -0.1, camY: 0.08, camZ: mobile ? 4.1 : 3.8, lookX: 0, lookY: mobile ? -0.75 : 0, rotY: TAU - 0.4, mix: 0, heat: 0.55, cool: 0, float: 0.8, offsetX: -0.42 * o },
    worn: { camX: 0, camY: 0.08, camZ: mobile ? 4.2 : 3.9, lookX: 0, lookY: mobile ? -0.7 : 0, rotY: TAU + 0.15, mix: 1, heat: 0.7, cool: 0, float: 0.7, offsetX: 0.42 * o },
    cooled: { camX: 0, camY: 0.06, camZ: mobile ? 4.6 : 3.8, lookX: 0, lookY: mobile ? -1.15 : -0.02, rotY: TAU - 0.35, mix: 1, heat: 0, cool: 1, float: 0.35, offsetX: -0.5 * o },
  };
}

@Component({
  selector: 'k-hero-story',
  standalone: true,
  imports: [RouterLink, GarmentImageComponent, ColorwayPickerComponent, SizePickerComponent, MagneticDirective, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-story.component.html',
  styleUrl: './hero-story.component.scss',
  host: { '[attr.data-chapter]': 'chapter()' },
})
export class HeroStoryComponent implements OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartStore);
  private readonly ui = inject(UiStore);
  protected readonly device = inject(DeviceService);

  protected readonly tee = this.catalog.bySlug('firing-tee')!;
  protected readonly hoodie = this.catalog.bySlug('kiln-hoodie')!;
  protected readonly glazeOrder: Colorway[] = ['bone', 'clay', 'celadon', 'soot'].map((id) => this.catalog.colorway(this.tee, id));

  protected readonly chapter = signal<Chapter>('hero');
  protected readonly glazeIndex = signal(0);
  protected readonly use3D = signal(this.device.can3D());
  protected readonly sceneReady = signal(false);

  // Showcase (cooled) commerce state
  protected readonly showColor = signal('oxide');
  protected readonly showSize = signal<Size | null>(null);
  protected readonly sizeError = signal(false);
  protected readonly justAdded = signal(false);
  protected readonly showColorway = computed(() => this.catalog.colorway(this.hoodie, this.showColor()));
  protected readonly sizeOptions = computed<SizeOption[]>(() =>
    this.hoodie.sizes.map((size) => {
      const qty = this.catalog.stockOf(this.hoodie, this.showColor(), size);
      return { size, qty, state: this.catalog.stockState(qty) };
    }),
  );

  // Fallback imagery (no WebGL)
  protected readonly fallbackSpec = computed<GarmentSpec>(() => {
    const ch = this.chapter();
    if (ch === 'worn' || ch === 'cooled') {
      return { kind: 'hoodie', colorway: this.showColorway(), front: this.hoodie.defaultFront, back: this.hoodie.defaultBack };
    }
    return { kind: 'tee', colorway: this.glazeOrder[ch === 'glaze' ? this.glazeIndex() : 0], front: this.tee.defaultFront, back: this.tee.defaultBack };
  });
  protected readonly fallbackView = computed(() => (this.chapter() === 'fired' ? 'back' : 'front'));

  private readonly root = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly chapterEls = viewChildren<ElementRef<HTMLElement>>('chapterEl');

  private scene: StoryScene | null = null;
  private cleanups: (() => void)[] = [];
  private pointerId: number | null = null;
  private lastX = 0;

  constructor() {
    afterNextRender(() => {
      this.initMotion();
      if (this.use3D()) this.init3D();
    });
  }

  // ── 3D ──
  private async init3D() {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return;
    try {
      const { StoryScene } = await import('../../three/scenes/story-scene');
      this.scene = new StoryScene({
        canvas,
        host: this.stage().nativeElement,
        tier: this.device.tier(),
        reducedMotion: this.device.reducedMotion(),
        onSlow: () => this.device.downgrade(),
      });
      // Adopt whatever the scroll timeline has already written.
      Object.assign(this.scene.target, keyframes(this.isMobile())[this.chapter()], this.dummyTarget);
      await this.scene.load(
        { kind: 'tee', colorway: this.glazeOrder[0], front: this.tee.defaultFront, back: this.tee.defaultBack },
        { kind: 'hoodie', colorway: this.showColorway(), front: this.hoodie.defaultFront, back: this.hoodie.defaultBack },
      );
      this.scene.playIntro();
      if (isDevMode()) (window as unknown as { kilnStory: unknown }).kilnStory = this.scene;
      this.sceneReady.set(true);

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        this.scene?.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      this.cleanups.push(() => window.removeEventListener('pointermove', onMove));
    } catch (err) {
      console.warn('[kiln] 3D unavailable, using still imagery', err);
      this.use3D.set(false);
      this.device.threeDisabled.set(true);
    }
  }

  // ── Scroll choreography ──
  private async initMotion() {
    const { gsap, ScrollTrigger } = await loadMotion();
    const reduced = this.device.reducedMotion();
    const mm = gsap.matchMedia();

    mm.add({ mobile: '(max-width: 899px)', desktop: '(min-width: 900px)' }, (ctx) => {
      const mobile = !!ctx.conditions?.['mobile'];
      const kf = keyframes(mobile);
      const els = this.chapterEls().map((r) => r.nativeElement);

      els.forEach((el, i) => {
        const name = CHAPTERS[i];
        // Chapter activation (copy fades in/out via CSS)
        ScrollTrigger.create({
          trigger: el,
          start: 'top 55%',
          end: 'bottom 45%',
          onToggle: (self) => {
            if (self.isActive) this.enter(name, kf[name]);
          },
        });

        if (i === 0) return;
        const prev = CHAPTERS[i - 1];
        if (!reduced) {
          // Scrubbed camera/garment move while the chapter scrolls in
          gsap.fromTo(
            this.sceneTarget(),
            { ...kf[prev] },
            {
              ...kf[name],
              ease: 'power2.inOut',
              immediateRender: false,
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 15%', scrub: true },
            },
          );
        }
      });

      // Glaze chapter: cycle colourways across its length
      const glazeEl = els[CHAPTERS.indexOf('glaze')];
      ScrollTrigger.create({
        trigger: glazeEl,
        start: 'top 45%',
        end: 'bottom 100%',
        onUpdate: (self) => this.setGlaze(Math.min(this.glazeOrder.length - 1, Math.floor(self.progress * this.glazeOrder.length))),
      });

      // Hero copy parallax out
      if (!reduced) {
        gsap.to(this.root.querySelector('.wordmark'), {
          yPercent: -30,
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: els[0], start: 'top top', end: 'bottom top', scrub: true },
        });
      }
    });

    // Intro: wordmark + copy
    if (!reduced) {
      const tl = gsap.timeline({ delay: 0.15 });
      tl.from(this.root.querySelectorAll('.wordmark span'), { yPercent: 100, duration: 1.6, stagger: 0.07, ease: 'expo.out' })
        .from(this.root.querySelectorAll('[data-intro]'), { y: 24, opacity: 0, duration: 1.1, stagger: 0.08 }, '-=1.1');
    }

    this.cleanups.push(() => mm.revert());
  }

  /** Tweens write to a proxy so they work before (and after) the lazy scene exists. */
  private readonly dummyTarget: Partial<StoryState> = { ...keyframes(matchMedia('(max-width: 899px)').matches).hero };
  private sceneTarget(): object {
    return this.proxy;
  }
  // Proxy forwards tween writes to the scene once it's ready.
  private readonly proxy = new Proxy(this.dummyTarget, {
    set: (obj, key, value) => {
      (obj as Record<string, number>)[key as string] = value;
      if (this.scene) (this.scene.target as unknown as Record<string, number>)[key as string] = value;
      return true;
    },
  });

  private enter(name: Chapter, state: Partial<StoryState>) {
    this.chapter.set(name);
    this.ui.headerTone.set(name === 'cooled' ? 'bone' : 'dark');
    if (this.device.reducedMotion() && this.scene) Object.assign(this.scene.target, state);
  }

  private setGlaze(i: number) {
    if (i === this.glazeIndex()) return;
    this.glazeIndex.set(i);
    this.scene?.setColorway('tee', this.glazeOrder[i]);
  }

  // ── Showcase interactions ──
  onShowColor(id: string) {
    this.showColor.set(id);
    this.scene?.setColorway('hoodie', this.showColorway());
    const size = this.showSize();
    if (size && this.catalog.stockOf(this.hoodie, id, size) <= 0) this.showSize.set(null);
  }

  onShowSize(size: Size) {
    this.showSize.set(size);
    this.sizeError.set(false);
  }

  addShowcase(ev: Event) {
    const size = this.showSize();
    if (!size) {
      this.sizeError.set(true);
      return;
    }
    const line = this.cart.add({ product: this.hoodie, colorwayId: this.showColor(), size, front: this.hoodie.defaultFront, back: this.hoodie.defaultBack });
    if (line) {
      this.ui.flyToBag((ev.currentTarget as HTMLElement).getBoundingClientRect(), this.showColorway().swatch);
      this.justAdded.set(true);
      setTimeout(() => this.justAdded.set(false), 1800);
    }
  }

  rotate(dir: 1 | -1) {
    this.scene?.nudge(dir * 0.9);
  }

  onPointerDown(e: PointerEvent) {
    if (this.chapter() !== 'cooled' || !this.scene) return;
    this.pointerId = e.pointerId;
    this.lastX = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.scene.dragStart();
  }

  onPointerMove(e: PointerEvent) {
    if (e.pointerId !== this.pointerId || !this.scene) return;
    this.scene.dragMove(e.clientX - this.lastX);
    this.lastX = e.clientX;
  }

  onPointerUp(e: PointerEvent) {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.scene?.dragEnd();
  }

  private isMobile() {
    return window.matchMedia('(max-width: 899px)').matches;
  }

  ngOnDestroy(): void {
    this.cleanups.forEach((fn) => fn());
    this.scene?.dispose();
    this.scene = null;
    this.ui.headerTone.set('dark');
  }
}
