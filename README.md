# grain-gradient

Lightweight TypeScript helpers for mesh + grain gradients.

![grain-gradient playground screenshot](https://raw.githubusercontent.com/aomona/grain-gradient/main/screenshot.png)

[Open the playground](https://aomona.github.io/grain-gradient/playground/)

## Installation

```bash
npm i grain-gradient
```

## Core CSS

```ts
import { createGrainGradientCSS, presets } from 'grain-gradient';

const css = createGrainGradientCSS(presets['Aurora Citrus']);
```

`grain-gradient` has no runtime dependencies. The core entry does not import React.

The playground can switch to a Canvas-generated PNG grain fallback for Android Chrome device testing.

See [API reference](./docs/API.md) for all core functions, React helpers, options, and presets.

## React

```tsx
import { GrainGradient } from 'grain-gradient/react';

export function Hero() {
  return (
    <GrainGradient
      colors={["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"]}
      style={{ minHeight: "100vh" }}
    />
  );
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
