# grain-gradient

Lightweight TypeScript helpers for mesh + grain gradients.

![grain-gradient playground preview](https://raw.githubusercontent.com/aomona/grain-gradient/main/grain-gradient-og.png)

[Open the playground](https://aomona.github.io/grain-gradient/playground/)

## Installation

```bash
npm i grain-gradient
```

## Core CSS

```ts
import { createGrainGradientCSS, presets } from "grain-gradient";

const css = createGrainGradientCSS({
  ...presets["Aurora Citrus"],
  motionPreset: "drift",
  motionSpeed: 38,
  motionIntensity: 46,
  swirl: 30,
});
```

`grain-gradient` has no runtime dependencies. The core entry does not import React.

The core API, playground, and React helper can switch to a Canvas-generated PNG grain fallback for Android Chrome device testing. The fallback helpers are SSR-safe: SVG grain is rendered first, then Canvas grain can be applied after hydration when Android Chrome is detected.

```ts
import { createAndroidCanvasFallbackStyle } from "grain-gradient";

const fallback = createAndroidCanvasFallbackStyle({ androidCanvasFallback: "auto" });
if (fallback) Object.assign(grainLayer.style, fallback);
```

`auto` is resolved where the helper runs. If you are exporting static CSS on a non-Android browser and want the Canvas fallback included, use `androidCanvasFallback: "on"` for that export.

For CSS generated with `createGrainGradientCSS()`, apply those values to the generated `::after` grain layer as a CSS override.

See [API reference](./docs/API.md) for all core functions, React helpers, options, and presets.

## React

```tsx
import { GrainGradient } from "grain-gradient/react";

export function Hero() {
  return (
    <GrainGradient
      colors={["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"]}
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

For SSR frameworks, pass the request user agent as a hint so `auto` can use the same Android Chrome detection after hydration:

```tsx
import { headers } from "next/headers";
import { GrainGradient } from "grain-gradient/react";

export default async function Page() {
  const userAgent = (await headers()).get("user-agent");

  return <GrainGradient androidCanvasFallback="auto" androidCanvasFallbackUserAgent={userAgent} />;
}
```

React is a peer dependency via the `grain-gradient/react` subpath.

## WebGL experimental

For continuously animated mesh backgrounds, use the optional WebGL renderer. The default CSS/SVG renderer remains the SSR-safe fallback.

The WebGL React component is client-only because it creates a `<canvas>` context. In SSR frameworks such as Next.js, render it from a client boundary (`"use client"`) or a dynamic import with `ssr: false`, and keep CSS/SVG available as the fallback for server output, static exports, unsupported browsers, and lost WebGL contexts.

```tsx
import { WebGLGrainGradient } from "grain-gradient/webgl/react";

export function AnimatedHero() {
  return (
    <WebGLGrainGradient
      colors={["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"]}
      motionPreset="drift"
      motionSpeed={38}
      motionIntensity={46}
      // Caps canvas pixel density for high-DPI performance.
      maxPixelRatio={1.25}
      style={{ minHeight: "100vh" }}
    />
  );
}
```

```tsx
import dynamic from "next/dynamic";

const WebGLGrainGradient = dynamic(
  () => import("grain-gradient/webgl/react").then((mod) => mod.WebGLGrainGradient),
  { ssr: false },
);
```

Use CSS/SVG for static backgrounds and exports; use WebGL as the default choice when smooth continuous mesh animation matters. Keep `maxPixelRatio` capped near `1` to `1.5` for full-screen backgrounds so high-DPI displays do not multiply GPU fill cost.

## Development

- `npm run build`: compile the TypeScript source to `dist/`
- `npm run test`: run the Node test suite after building
- `npm run lint`: check the codebase with oxlint
- `npm run format:check`: verify formatting with oxfmt
- `npm run playground`: open the Vite playground at `/playground/`

## Local playground

Run the Vite-powered playground with hot reload:

```bash
npm run dev
```

Then open `http://localhost:5173/playground/` to tune presets, colors, and grain settings live.

Use `npm run playground` to start Vite and open the playground automatically.
