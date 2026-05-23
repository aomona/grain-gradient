# API reference

`grain-gradient` provides a dependency-free core API and optional React helpers via a subpath export.

## Import paths

```ts
import {
  createGrainGradientCSS,
  createMeshGradient,
  createTurbulenceNoise,
  presets,
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

| Option | Default | Range / note |
| --- | ---: | --- |
| `frequency` | `1.25` | Clamped to `0.04` – `2.4` |
| `baseFrequency` | — | Alias fallback for `frequency` |
| `contrast` | `1.7` | Clamped to `1.0` – `2.5` |
| `seed` | `1` | Clamped to `0` – `9999` |
| `numOctaves` | `2` | Clamped to `1` – `5` |
| `stitchTiles` | `true` | Uses SVG `stitchTiles` |
| `width` | `3200` | SVG canvas width |
| `height` | `2200` | SVG canvas height |
| `size` | — | Fallback for both width and height |

The playground can switch to a Canvas-generated PNG grain fallback on Android Chrome for device testing. The core API always returns SVG turbulence noise.

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

| Option | Default | Note |
| --- | --- | --- |
| `colors` | `['#7c3aed', '#06b6d4', '#f97316', '#f43f5e']` | Uses up to 6 colors |
| `baseColor` | `#0b1020` | Used in the base linear gradient |
| `blur` | — | Used by CSS/React layer helpers, not the returned image string |
| `saturation` | — | Used by CSS/React layer helpers |
| `intensity` | — | Fallback alias for saturation in layer helpers |

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
});
```

Options include all `createMeshGradient` and `createTurbulenceNoise` options, plus:

| Option | Default | Note |
| --- | --- | --- |
| `selector` | `.grain-gradient` | CSS selector for the generated snippet |
| `opacity` | `0.34` | Grain layer opacity |
| `blendMode` | `overlay` | Grain layer `mix-blend-mode` |
| `motionPreset` | `none` | `none`, `drift`, `breathe`, or `orbit` |
| `motionSpeed` | `0` | `0` – `100`; `0` disables animation |
| `motionIntensity` | `50` | `0` – `100`; controls travel/zoom strength |

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
      style={{ minHeight: "100vh" }}
    />
  );
}
```

Props:

- All `createGrainGradientCSS` options
- `className?: string`
- `style?: React.CSSProperties`
- `children?: React.ReactNode`

The component does not add text or UI by itself. If children are passed, they are rendered above the background layers.

### `useGrainGradient(options?)`

Returns computed styles for custom composition.

```tsx
const { rootStyle, meshStyle, grainStyle, cssText } = useGrainGradient({
  colors: presets["Blue Hour"].colors,
});
```

Return value:

| Key | Description |
| --- | --- |
| `rootStyle` | Relative/overflow-hidden container style |
| `meshStyle` | Mesh layer style |
| `grainStyle` | SVG turbulence grain layer style |
| `cssText` | Minimal mesh background CSS text |

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
