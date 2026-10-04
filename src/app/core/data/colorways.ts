import { Colorway, PrintId, PrintOption } from '../models/product';

// Colorways are named after what happens inside a kiln.
export const COLORWAYS = {
  soot: {
    id: 'soot',
    name: 'Soot',
    swatch: '#161513',
    fabric: '#23211f',
    ink: '#e9e1d3',
    note: 'Reduction black. Carbon trapped in the clay.',
  },
  ash: {
    id: 'ash',
    name: 'Ash',
    swatch: '#6d6862',
    fabric: '#77726b',
    ink: '#f1ebe1',
    heather: true,
    note: 'Heathered grey. What the fire leaves behind.',
  },
  bone: {
    id: 'bone',
    name: 'Bone',
    swatch: '#e7dfd1',
    fabric: '#e4dccd',
    ink: '#1a1816',
    note: 'Bisque white. Once-fired, unglazed.',
  },
  clay: {
    id: 'clay',
    name: 'Clay',
    swatch: '#a9593b',
    fabric: '#ab5d3f',
    ink: '#f3e9dc',
    note: 'Terracotta. Iron-rich earthenware.',
  },
  oxide: {
    id: 'oxide',
    name: 'Oxide',
    swatch: '#6f2a1b',
    fabric: '#7b3222',
    ink: '#f0e2d2',
    note: 'Deep iron red. Oxidation firing.',
  },
  celadon: {
    id: 'celadon',
    name: 'Celadon',
    swatch: '#97ab98',
    fabric: '#99ad9a',
    ink: '#1b211c',
    note: 'Pale jade glaze. Cone 10 reduction.',
  },
} satisfies Record<string, Colorway>;

export type ColorwayId = keyof typeof COLORWAYS;

export const PRINT_LABELS: Record<PrintId, string> = {
  none: 'Blank',
  wordmark: 'Wordmark',
  cone: 'Cone 10',
  seal: 'Kiln seal',
  firing: 'Firing 04 chart',
  glaze: 'Glaze rings',
};

export function printOptions(ids: PrintId[], placement: 'front' | 'back'): PrintOption[] {
  return ids.map((id) => ({ id, label: PRINT_LABELS[id], placement }));
}
