// A single fixed planar UV frame shared by every garment, so prints,
// seams and ribs painted in "garment units" land in the same place on
// the mesh regardless of product.

export const UV_FRAME = { x0: -0.95, y0: -0.85, size: 1.9 } as const;

export function uvOf(x: number, y: number): [number, number] {
  return [(x - UV_FRAME.x0) / UV_FRAME.size, (y - UV_FRAME.y0) / UV_FRAME.size];
}

/** Garment units → canvas pixels (canvas y grows downward; texture.flipY maps top row to v=1) */
export function toCanvas(x: number, y: number, size: number): [number, number] {
  const [u, v] = uvOf(x, y);
  return [u * size, (1 - v) * size];
}

export function unitsToPx(units: number, size: number): number {
  return (units / UV_FRAME.size) * size;
}
