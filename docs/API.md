# API reference

`grain-gradient` provides a dependency-free core API and optional React helpers via a subpath export.

## Import paths

```ts
import {
  createAndroidCanvasFallbackStyle,
  createCanvasGrainBackgroundSize,
  createCanvasGrainNoise,
  createGrainGradientCSS,
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
  opacity: 0.34,
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
| `opacity`         | `0.34`            | Grain layer opacity                        |
| `blendMode`       | `overlay`         | Grain layer `mix-blend-mode`               |
| `motionPreset`    | `none`            | `none`, `drift`, `breathe`, or `orbit`     |
| `motionSpeed`     | `0`               | `0` – `100`; `0` disables animation        |
| `motionIntensity` | `50`              | `0` – `100`; controls travel/zoom strength |

`swirl` is part of the mesh options and is clamped to `0` – `100`. It affects the generated `::before` mesh layer by adjusting `background-size`, `background-position`, and `transform`; `createMeshGradient()` itself still returns only a `background-image` value.

The generated grain layer uses:

```css
background-size: 100% 100%;
background-repeat: no-repeat;
pointer-events: none;
```

When motion is enabled, the generated CSS appends `animation` declarations, scoped `@keyframes`, and a `prefers-reduced-motion: reduce` override for the selected preset. The animation is CSS-only, so the SVG noise data URL is not regenerated per frame.

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
      opacity={0.34}
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

| Key          | Description                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootStyle`  | Relative/overflow-hidden container style                                                                                                          |
| `meshStyle`  | Mesh layer style                                                                                                                                  |
| `grainStyle` | Active grain layer style. It starts as SVG turbulence and may switch to repeated Canvas PNG after hydration when `androidCanvasFallback` applies. |
| `cssText`    | Minimal mesh background CSS text                                                                                                                  |

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
