export type GarmentKind = 'tee' | 'longsleeve' | 'crew' | 'hoodie';
export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type PrintId = 'none' | 'wordmark' | 'cone' | 'seal' | 'firing' | 'glaze';

export interface Colorway {
  id: string;
  name: string;
  /** Swatch colour for UI */
  swatch: string;
  /** Base fabric albedo used by the 3D renderer (slightly lifted so folds read) */
  fabric: string;
  /** Screen-print ink colour that reads on this fabric */
  ink: string;
  /** Heathered yarn (mottled) */
  heather?: boolean;
  /** Glaze-chart note shown in UI */
  note: string;
}

export interface PrintOption {
  id: PrintId;
  label: string;
  placement: 'front' | 'back';
}

export interface Review {
  author: string;
  location: string;
  rating: number;
  size: Size;
  fit: 'Runs small' | 'True to size' | 'Runs large';
  title: string;
  body: string;
  date: string;
}

export interface Hotspot {
  id: string;
  label: string;
  detail: string;
  /** Position in garment space (x, y, side) — resolved to 3D by the viewer */
  x: number;
  y: number;
  side: 'front' | 'back';
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  kind: GarmentKind;
  firing: string;
  cone: string;
  price: number;
  compareAt?: number;
  gsm: number;
  fit: string;
  tagline: string;
  description: string;
  details: string[];
  materials: string[];
  care: string[];
  colorways: Colorway[];
  sizes: Size[];
  /** stock[colorwayId][size] */
  stock: Record<string, Partial<Record<Size, number>>>;
  frontPrints: PrintId[];
  backPrints: PrintId[];
  defaultFront: PrintId;
  defaultBack: PrintId;
  hotspots: Hotspot[];
  reviews: Review[];
  isNew?: boolean;
  limited?: number;
}

export interface CartLine {
  key: string;
  productId: string;
  colorwayId: string;
  size: Size;
  front: PrintId;
  back: PrintId;
  qty: number;
}

export interface GarmentSpec {
  kind: GarmentKind;
  colorway: Colorway;
  front: PrintId;
  back: PrintId;
}
