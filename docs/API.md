# API reference

`grain-gradient` provides a dependency-free core API and optional React helpers via a subpath export.

## Import paths

```ts
import {
  createAndroidCanvasFallbackStyle,
  createCanvasGrainBackgroundSize,
  createCanvasGrainNoise,
  createGrainGradientCSS,
  createGrainLayerStyle,
  createMeshGradient,
  createTurbulenceNoise,
  isAndroidChrome,
  presets,
  shouldUseAndroidCanvasFallback,
} from "grain-gradient";
```

```tsx
import { GrainGradient, useGrainGradient } from "grain-gradient/react";
```

```ts
import { createWebGLMeshRenderer } from "grain-gradient/webgl";
```

```tsx
import { WebGLGrainGradient } from "grain-gradient/webgl/react";
```

`grain-gradient/react` is an import path, not a separate package.

## Core API

### `createTurbulenceNoise(options?)`

Creates a CSS `url("data:image/svg+xml,...")` value using SVG `feTurbulence`.

```ts
const noise = createTurbulenceNoise({
  frequency: 1.25,
  contrast: 1.7,
  seed: 8,
});
```

Options:

| Option          | Default | Range / note                       |
| --------------- | ------: | ---------------------------------- |
| `frequency`     |  `1.25` | Clamped to `0.04` – `2.4`          |
| `baseFrequency` |       — | Alias fallback for `frequency`     |
| `contrast`      |   `1.7` | Clamped to `1.0` – `2.5`           |
| `seed`          |     `1` | Clamped to `0` – `9999`            |
| `numOctaves`    |     `2` | Clamped to `1` – `5`               |
| `stitchTiles`   |  `true` | Uses SVG `stitchTiles`             |
| `width`         |  `3200` | SVG canvas width                   |
| `height`        |  `2200` | SVG canvas height                  |
| `size`          |       — | Fallback for both width and height |

The SVG helper always returns SVG turbulence noise. Use the Canvas fallback helpers below when Android Chrome needs a PNG grain fallback.

### Canvas fallback helpers

The core entry also exposes framework-agnostic helpers for applying the Android Chrome Canvas fallback outside React:

```ts
import { createAndroidCanvasFallbackStyle } from "grain-gradient";

const fallback = createAndroidCanvasFallbackStyle({
  androidCanvasFallback: "auto",
  seed: 8,
  frequency: 1.25,
  contrast: 1.7,
});

if (fallback) Object.assign(grainLayer.style, fallback);
```

`androidCanvasFallback: "auto"` is resolved where this helper runs. For runtime usage, call it in the browser after hydration. For static CSS export, use `"on"` when you want the PNG fallback CSS included regardless of the browser used to generate the CSS.

If you use `createGrainGradientCSS()` and its `::after` grain pseudo-element, append an override instead of assigning element styles:

```ts
const selector = ".grain-gradient";
const fallback = createAndroidCanvasFallbackStyle({ androidCanvasFallback: "auto" });

const fallbackCss = fallback
  ? `${selector}::after {
  background-image: ${fallback.backgroundImage};
  background-size: ${fallback.backgroundSize};
  background-repeat: ${fallback.backgroundRepeat};
  image-rendering: ${fallback.imageRendering};
}`
  : "";
```

- `isAndroidChrome(userAgent?)` detects Android Chrome while excluding WebView, Edge, Opera, Samsung Browser, and Firefox.
- `shouldUseAndroidCanvasFallback(fallback, userAgent?)` resolves `"auto" | "on" | "off"`.
- `createCanvasGrainNoise(options?)` returns a Canvas-generated PNG CSS `url(...)` in browsers, or `null` when `document` / Canvas is unavailable.
- `createCanvasGrainBackgroundSize(options?)` returns the repeated PNG tile size for the provided grain frequency.
- `createGrainLayerStyle(options?)` returns the SVG grain layer sizing (`background-size` + `background-repeat`). The SVG grain is drawn at a fixed CSS-pixel size, then repeated, so grain density is not tied to each container's dimensions.
- `createAndroidCanvasFallbackStyle(options?)` returns `{ backgroundImage, backgroundSize, backgroundRepeat, imageRendering }` when the fallback applies and Canvas generation succeeds; otherwise it returns `null`.

Like the React helper, these functions are SSR-safe as long as they are called after hydration or guarded by their `null` return value.

### `createMeshGradient(options?)`

Creates a CSS `background-image` value with radial gradients and a base linear gradient.

```ts
const mesh = createMeshGradient({
  colors: ["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"],
  baseColor: "#0f1020",
});
```

This returns only the background image value, not full CSS declarations.

Options:

| Option       | Default                                        | Note                                                                              |
| ------------ | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `colors`     | `['#7c3aed', '#06b6d4', '#f97316', '#f43f5e']` | Uses up to 6 colors                                                               |
| `baseColor`  | `#0b1020`                                      | Used in the base linear gradient                                                  |
| `blur`       | —                                              | Used by CSS/React layer helpers, not the returned image string                    |
| `saturation` | —                                              | Used by CSS/React layer helpers                                                   |
| `intensity`  | —                                              | Fallback alias for saturation in layer helpers                                    |
| `swirl`      | `0`                                            | `0` – `100`; rotates, scales, and repositions the mesh layer in CSS/React helpers |

### `createGrainGradientCSS(options?)`

Creates framework-independent CSS with a root selector, a mesh `::before` layer, and a grain `::after` layer.

```ts
const css = createGrainGradientCSS({
  selector: ".grain-gradient",
  colors: ["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"],
  opacity: 0.2,
  blendMode: "overlay",
  motionPreset: "drift",
  motionSpeed: 38,
  motionIntensity: 46,
  swirl: 30,
});
```

Options include all `createMeshGradient` and `createTurbulenceNoise` options, plus:

| Option            | Default           | Note                                       |
| ----------------- | ----------------- | ------------------------------------------ |
| `selector`        | `.grain-gradient` | CSS selector for the generated snippet     |
| `opacity`         | `0.2`             | Grain layer opacity                        |
| `blendMode`       | `overlay`         | Grain layer `mix-blend-mode`               |
| `motionPreset`    | `none`            | `none`, `drift`, `breathe`, or `orbit`     |
| `motionSpeed`     | `0`               | `0` – `100`; `0` disables animation        |
| `motionIntensity` | `50`              | `0` – `100`; controls travel/zoom strength |

`swirl` is part of the mesh options and is clamped to `0` – `100`. It affects the generated `::before` mesh layer by adjusting `background-size`, `background-position`, and `transform`; `createMeshGradient()` itself still returns only a `background-image` value.

The generated grain layer uses:

```css
background-size: 3200px 2200px;
background-repeat: repeat;
pointer-events: none;
contain: paint;
```

The fixed CSS-pixel grain size keeps visible roughness more consistent across different container sizes and display scale factors, and avoids stretching the SVG noise to every element. Pass `width` / `height` / `size` when you want a different fixed grain canvas; these options now affect both SVG dimensions and the visible grain tile size.

When motion is enabled, the generated CSS appends `animation` declarations, scoped `@keyframes`, and a `prefers-reduced-motion: reduce` override for the selected preset. The animation is CSS-only, so the SVG noise data URL is not regenerated per frame.
`will-change: transform` is only emitted while motion is enabled to avoid keeping extra compositor layers alive for static backgrounds. Paint containment is only applied to the grain layer, not the blurred mesh layer, to avoid clipping blur overflow.

The CSS motion presets are transform-only. `breathe` no longer animates `filter`, and `orbit` no longer animates `background-position`, because both properties can trigger repeated paint work on large blurred backgrounds.

## React API

### `<GrainGradient />`

Renders a background-only root with two absolute layers: mesh and grain.

```tsx
import { GrainGradient } from "grain-gradient/react";

export function Background() {
  return (
    <GrainGradient
      colors={["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"]}
      frequency={1.25}
      contrast={1.7}
      opacity={0.2}
      blendMode="overlay"
      motionPreset="drift"
      motionSpeed={38}
      motionIntensity={46}
      swirl={30}
      androidCanvasFallback="auto"
      style={{ minHeight: "100vh" }}
    />
  );
}
```

Props:

- All `createGrainGradientCSS` options
- `androidCanvasFallback?: "auto" | "on" | "off"` — Built-in Canvas PNG fallback on Android Chrome, powered by the core fallback helpers. `auto` detects Android Chrome after hydration; SSR renders SVG grain first, so there is no server-side `window`, `navigator`, or `canvas` access. The Canvas fallback uses `seed`, `frequency` / `baseFrequency`, and `contrast`; SVG-specific sizing options remain SVG-only.
- `androidCanvasFallbackUserAgent?: string | null` — Optional SSR user-agent hint for `androidCanvasFallback="auto"`. Pass the request UA from frameworks such as Next.js so the post-hydration fallback decision matches server-known user-agent data.
- `className?: string`
- `style?: React.CSSProperties`
- `children?: React.ReactNode`

The component does not add text or UI by itself. If children are passed, they are rendered above the background layers.
When layering children, keep decorative layers `aria-hidden` and raise interactive/content children with `position`/`z-index` as needed so they remain accessible and clickable.

SSR framework example with Next.js App Router:

```tsx
import { headers } from "next/headers";
import { GrainGradient } from "grain-gradient/react";

export default async function Page() {
  const userAgent = (await headers()).get("user-agent");

  return <GrainGradient androidCanvasFallback="auto" androidCanvasFallbackUserAgent={userAgent} />;
}
```

The user-agent hint is only used after hydration to decide whether to generate Canvas grain. The server render remains SVG-only to avoid hydration mismatches and server-side Canvas requirements.

### `useGrainGradient(options?)`

Returns computed styles for custom composition.

```tsx
const { rootStyle, meshStyle, grainStyle, cssText } = useGrainGradient({
  colors: presets["Blue Hour"].colors,
});
```

Return value:

| Key          | Description                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootStyle`  | Relative/overflow-hidden container style                                                                                                                              |
| `meshStyle`  | Mesh layer style                                                                                                                                                      |
| `grainStyle` | Active grain layer style. It starts as fixed-size repeated SVG turbulence and may switch to repeated Canvas PNG after hydration when `androidCanvasFallback` applies. |
| `cssText`    | Minimal mesh background CSS text                                                                                                                                      |

## WebGL API experimental

Animated fullscreen mesh gradients can be rendered with an optional WebGL canvas renderer. The default CSS/SVG renderer remains the SSR-safe baseline and fallback; WebGL is intended for client-side animated mesh motion.

```ts
import { createWebGLMeshRenderer } from "grain-gradient/webgl";

const canvas = document.querySelector("canvas")!;
const renderer = createWebGLMeshRenderer(canvas, {
  colors: ["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"],
  motionPreset: "drift",
  motionSpeed: 38,
  motionIntensity: 46,
  maxPixelRatio: 1.25,
  motionMaxPixelRatio: 0.75,
  fps: 30,
});

renderer?.start();
```

The renderer exposes:

- `update(options)` — update colors, saturation, swirl, motion, `maxPixelRatio`, `motionMaxPixelRatio`, or `fps`
- `start()` / `stop()` — control the animation loop
- `resize()` — sync the canvas backing store to its CSS size and capped DPR
- `destroy()` — stop animation and release WebGL resources

React users can use the progressive-enhancement component:

```tsx
import { WebGLGrainGradient } from "grain-gradient/webgl/react";

export function AnimatedBackground() {
  return (
    <WebGLGrainGradient
      colors={["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"]}
      motionPreset="drift"
      motionSpeed={38}
      motionIntensity={46}
      maxPixelRatio={1.25}
      motionMaxPixelRatio={0.75}
      fps={30}
      style={{ minHeight: "100vh" }}
    />
  );
}
```

`WebGLGrainGradient` renders the existing CSS mesh as fallback, then fades in a WebGL canvas after the client creates a working context. The SVG/canvas grain layer is still overlaid above the WebGL mesh. If WebGL is unavailable or the context is lost, the CSS fallback remains visible.

WebGL options:

| Option                | Default                       | Note                                                                 |
| --------------------- | ----------------------------- | -------------------------------------------------------------------- |
| `maxPixelRatio`       | `1.25`                        | Caps static canvas backing resolution to avoid high-DPR GPU spikes   |
| `motionMaxPixelRatio` | `min(maxPixelRatio, 0.75)`    | Caps canvas backing resolution while motion is active                |
| `fps`                 | `30`                          | Caps renderer frame rate                                             |
| `pauseWhenHidden`     | `true`                        | Skips drawing while `document.hidden`                                |

Prefer CSS/SVG for static or SSR-only backgrounds. Prefer WebGL as the default renderer for smooth continuous mesh animation.

Performance notes:

- When `motionPreset` is `"none"` or `motionSpeed` is `0`, WebGL draws once and stops instead of keeping a `requestAnimationFrame` loop alive.
- While motion is active, blob position and size animation is computed once per frame and passed to the shader as uniforms, avoiding per-pixel trigonometry in the fragment shader.
- For sharper or smoother animated backgrounds, raise `motionMaxPixelRatio` toward `1` to `1.5` or `fps` toward `45` to `60`.

```tsx
<WebGLGrainGradient motionPreset="drift" motionSpeed={35} fps={30} motionMaxPixelRatio={0.75} />
```

## Presets

```ts
import { presets } from "grain-gradient";
```

Available presets:

- `Aurora Citrus`
- `Blue Hour`
- `Candy Fog`
- `Forest Glass`
- `Midnight Bloom`

Each preset contains:

```ts
{
  colors: string[];
  baseColor: string;
}
```

Example:

```tsx
<GrainGradient {...presets["Midnight Bloom"]} />
```

## Local playground

```bash
npm run playground
```

The playground is a static, dependency-free preview app served by a tiny Node HTTP server. It imports the built core API from `dist/index.js`.
