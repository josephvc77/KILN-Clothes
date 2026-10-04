import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, inject } from '@angular/core';
import { HeroStoryComponent } from '../../components/hero/hero-story.component';
import { CollectionRailComponent } from '../../components/home/collection-rail.component';
import { GlazeChartComponent } from '../../components/home/glaze-chart.component';
import { StudioComponent } from '../../components/home/studio.component';
import { UiStore } from '../../core/services/ui.store';

@Component({
  selector: 'k-home-page',
  standalone: true,
  imports: [HeroStoryComponent, CollectionRailComponent, GlazeChartComponent, StudioComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <k-hero-story />
    <k-collection-rail />
    <k-glaze-chart />
    <k-studio />
  `,
})
export class HomePage implements OnDestroy {
  private readonly ui = inject(UiStore);
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private observer: IntersectionObserver | null = null;

  constructor() {
    // Header adopts the tone of whichever section sits beneath it.
    afterNextRender(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const el = e.target as HTMLElement;
            if (el.tagName === 'K-HERO-STORY') continue; // story manages its own tone
            this.ui.headerTone.set(el.querySelector('[data-theme="bone"]') ? 'bone' : 'dark');
          }
        },
        { rootMargin: '0px 0px -94% 0px' },
      );
      Array.from(this.host.children).forEach((c) => this.observer!.observe(c));
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.ui.headerTone.set('dark');
  }
}
