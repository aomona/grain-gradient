# grain-gradient

Lightweight TypeScript helpers for mesh + grain gradients.

![grain-gradient playground screenshot](https://raw.githubusercontent.com/aomona/grain-gradient/main/screenshot.png)

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

Run a lightweight preview server with:

```bash
npm run playground
```

Then open `http://localhost:4173/playground/` to tune presets, colors, and grain settings live.
