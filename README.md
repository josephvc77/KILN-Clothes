# KILN — Heavyweight garments. Fired, not made.

A 3D ecommerce storefront prototype for **KILN**, a heavyweight tee and hoodie label. The brand is built around
the ceramic kiln: products come in drops called *Firings*, colourways are named after kiln stages
(Soot, Ash, Bone, Clay, Oxide, Celadon), and the site moves from a dark, ember-lit chamber into a
bone-white studio where you buy.

Angular 18 (standalone, signals, zoneless) · Three.js · GSAP ScrollTrigger · SCSS tokens.

```bash
npm install
npm start            # http://localhost:4200
npm run build        # production build → dist/kiln
```

Append `?no3d` to any URL to test the non-WebGL fallback.

## Experience

| Surface | What happens |
| --- | --- |
| **Home story** | A pinned WebGL stage. The tee forms out of embers, the camera closes in on the chest (*Raw*), it turns to show the firing-chart back print (*Fired*), cycles colourways (*Glaze*), burns into the hoodie (*Worn*), and the kiln cools to a bone studio with a live buy panel: drag to rotate, colourway, size, add to bag. |
| **Collection rail** | Horizontal pinned travel on desktop, native scroll-snap on touch. |
| **Glaze board** | Colourways shown as ceramic test tiles; each one filters the shop. |
| **Shop** | URL-driven filters (`?kind=&color=&size=&sort=`), an editorial grid, and cards with back-view swap on hover, colourway preview, quick-add by size and wishlist. |
| **Product page** | 3D viewer (orbit, pinch/wheel zoom, front/back, reset, fullscreen, keyboard, hotspots), live print customiser, per-size stock, size guide dialog, reviews, related products, and a sticky buy bar. |
| **Cart** | Fly-to-bag animation, badge bump, an "Added to bag" toast (announced to screen readers), a glass drawer with quantity controls and a free-shipping meter. |
| **Search** | Fullscreen overlay (`/` or `⌘K`), instant results with arrow-key navigation, recent searches, shop-by-glaze. |
| **Checkout** | Validated contact and delivery form. The prototype stops before payment (see below). |

## The 3D garment engine (`src/app/three/garment`)

There are no model files. Each garment is generated at runtime:

1. **Silhouette** (`silhouettes.ts`): pure 2D outline math, shared with the SVG fallback.
2. **Inflation** (`garment-geometry.ts`): the outline is Delaunay-meshed. Each vertex is lifted by a height field based on its distance to the seam: a rounded edge, torso volume, sleeve compression rings, armpit drag lines, hem drape and rib gathering. Front and back sheets share the side seam, so normals stay smooth.
3. **Fabric** (`fabric-textures.ts`, `prints.ts`): a procedural jersey knit, plus seams, twin-needle hems, rib bands and pocket stitching baked into a normal map. Screen prints are drawn procedurally and distressed like discharge ink. The material is `MeshPhysicalMaterial` with `sheen` for the cotton fuzz.
4. **Trims** (`garment.ts`): rib collar tubes, a standing hood with dark lining, kangaroo pocket, waxed cords and steel aglets.
5. **Ember dissolve** (`ember-dissolve.ts`): a shader patch that burns garments in and out from the hem upward with a glowing edge.

`ThumbnailRenderer` uses the same engine to render every colourway × print combination to WebP. These renders serve as product photography for cards, cart, search and stills. It uses one GL context and releases it when idle.

## Architecture

```
src/app/
  core/        models, catalog data, signal stores (cart, wishlist, ui), device tiering, order seam
  three/       garment engine, stage lifecycle, kiln environment, story/viewer/thumbnail scenes
  components/  navigation, hero story, home sections, product card/viewer, cart, search, ui pickers
  pages/       home, shop, product, checkout, wishlist, not-found (all lazy routes)
  shared/      directives (magnetic, reveal, glass sheen), pipes, focus trap
  motion/      lazy GSAP + ScrollTrigger loader
src/styles/    _tokens.scss (the whole brand), _glass.scss (liquid glass material)
```

- **Performance.** The initial bundle is about 88 kB gzipped. Three.js and GSAP load lazily, and scenes are created only when needed. Quality tiers (`DeviceService`) set DPR caps, mesh density, texture size and ember count. Frame times are watched at runtime and quality steps down automatically. Scenes pause off-screen and dispose all GPU resources on destroy.
- **Accessibility.** Semantic landmarks, skip link, radio-group pickers with arrow keys, focus-trapped drawer and search, native `<dialog>` for the size guide, `aria-live` confirmations, and a keyboard-operable 3D viewer. Every product also has still images, so 3D is never the only way to see it.
- **Reduced motion.** No scrubbed camera, parallax, magnetic pull, intro dissolve or idle turntable, and the embers are nearly still.
- **Rebranding.** Edit `src/styles/_tokens.scss` and `src/app/core/data/`.

## Integration points

- `CatalogService`: replace the static `CATALOG` with your commerce API (Shopify Storefront, Medusa, etc.). Consumers depend only on its methods.
- `OrderService.createOrder()`: POST the draft to your backend, create a payment session (for example Stripe Checkout) and return its URL. The page already redirects when `paymentUrl` is set. Card data never touches this frontend.
- Accounts are not implemented. The wishlist and cart persist in `localStorage`.
