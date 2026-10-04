// GSAP is loaded on demand; ScrollTrigger is registered exactly once.
import type { gsap as GSAP } from 'gsap';
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger';

export interface Motion {
  gsap: typeof GSAP;
  ScrollTrigger: typeof ST;
}

let loading: Promise<Motion> | null = null;

export function loadMotion(): Promise<Motion> {
  if (!loading) {
    loading = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, s]) => {
      g.gsap.registerPlugin(s.ScrollTrigger);
      g.gsap.defaults({ ease: 'expo.out', duration: 1.1 });
      return { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger };
    });
  }
  return loading;
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
