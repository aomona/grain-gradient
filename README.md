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

## Local playground

Run the Vite-powered playground with hot reload:

```bash
npm run dev
```

Then open `http://localhost:5173/playground/` to tune presets, colors, and grain settings live.

Use `npm run playground` to start Vite and open the playground automatically.
