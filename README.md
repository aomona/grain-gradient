# grain-gradient

Lightweight TypeScript helpers for WebGL shader mesh + grain gradients.

> **v2 is WebGL-only.** The library now renders through a single WebGL fragment shader. CSS/SVG gradient generation APIs from v1 (`createGrainGradientCSS`, `createMeshGradient`, `createTurbulenceNoise`, `createAndroidCanvasFallbackStyle`, and related Android/canvas fallback helpers) have been removed.

![grain-gradient playground preview](https://raw.githubusercontent.com/aomona/grain-gradient/main/grain-gradient-og.png)

[Open the playground](https://aomona.github.io/grain-gradient/)

## Installation

```bash
npm i grain-gradient
```

## WebGL shader renderer

`grain-gradient` renders both the mesh gradient and the grain texture in one WebGL fragment shader. The React component keeps only a minimal `baseColor` background behind the canvas, so SSR and unsupported WebGL environments do not render a blank transparent box.

```tsx
import { GrainGradient, presets } from "grain-gradient/react";

export function Hero() {
  return (
    <GrainGradient
      {...presets["Aurora Citrus"]}
      motionPreset="drift"
      motionSpeed={38}
      motionIntensity={46}
      swirl={30}
      opacity={0.22}
      style={{ minHeight: "100vh" }}
    />
  );
}
```

The component creates a `<canvas>` context on the client. If WebGL is unavailable or the WebGL context is lost, the component keeps only the `baseColor` background; it does not provide a CSS/SVG or 2D canvas fallback.

In SSR frameworks such as Next.js, render it from a client boundary (`"use client"`) or with a dynamic import using `ssr: false`.

```tsx
import dynamic from "next/dynamic";

const GrainGradient = dynamic(
  () => import("grain-gradient/react").then((mod) => mod.GrainGradient),
  { ssr: false },
);
```

## Framework-agnostic renderer

```ts
import { createWebGLMeshRenderer } from "grain-gradient";

const canvas = document.querySelector("canvas")!;
const renderer = createWebGLMeshRenderer(canvas, {
  colors: ["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"],
  motionPreset: "drift",
  motionSpeed: 38,
  motionIntensity: 46,
  opacity: 0.22,
});

renderer?.start();
```

Call `renderer.update(options)` to merge changed controls, or `renderer.replaceOptions(options)` to
apply a complete options snapshot and reset omitted values. Call `renderer.resize()` when the canvas
layout changes, and `renderer.destroy()` during cleanup.

## Performance defaults

Animated fullscreen rendering is tuned conservatively by default:

- `fps: 30`
- `maxPixelRatio: 1.25`
- `motionMaxPixelRatio: 0.75`
- `pauseWhenHidden: true`

Raise these only when you need sharper or smoother animated rendering.

## Development

- `npm run build`: compile the TypeScript source to `dist/`
- `npm run build:playground`: build the Vite React playground to `dist-playground/`
- `npm run test`: run the Node test suite after building
- `npm run lint`: check the codebase with oxlint
- `npm run format:check`: verify formatting with oxfmt
- `npm run playground`: open the Vite playground at `/`

## Local playground

Run the Vite-powered playground with hot reload:

```bash
npm run dev
```

Then open `http://localhost:5173/`.
