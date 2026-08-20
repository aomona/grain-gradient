import test from "node:test";
import assert from "node:assert/strict";

import { createWebGLMeshRenderer } from "../dist/webgl.js";

const createHarness = ({ devicePixelRatio = 2, width = 100, height = 40 } = {}) => {
  const calls = {
    draws: 0,
    rects: 0,
    uniforms: new Map(),
  };
  const gl = {
    ARRAY_BUFFER: 0x8892,
    COMPILE_STATUS: 0x8b81,
    FLOAT: 0x1406,
    FRAGMENT_SHADER: 0x8b30,
    LINK_STATUS: 0x8b82,
    STATIC_DRAW: 0x88e4,
    TRIANGLES: 0x0004,
    VERTEX_SHADER: 0x8b31,
    attachShader() {},
    bindBuffer() {},
    bufferData() {},
    compileShader() {},
    createBuffer: () => ({}),
    createProgram: () => ({}),
    createShader: () => ({}),
    deleteBuffer() {},
    deleteProgram() {},
    deleteShader() {},
    drawArrays() {
      calls.draws += 1;
    },
    enableVertexAttribArray() {},
    getAttribLocation: () => 0,
    getProgramInfoLog: () => "",
    getProgramParameter: () => true,
    getShaderInfoLog: () => "",
    getShaderParameter: () => true,
    getUniformLocation: (_program, name) => name,
    linkProgram() {},
    shaderSource() {},
    uniform1f(location, value) {
      calls.uniforms.set(location, value);
    },
    uniform1fv() {},
    uniform1i() {},
    uniform2f() {},
    uniform2fv() {},
    uniform3fv() {},
    useProgram() {},
    vertexAttribPointer() {},
    viewport() {},
  };
  const canvas = {
    width: 0,
    height: 0,
    getBoundingClientRect() {
      calls.rects += 1;
      return { width, height };
    },
    getContext: () => gl,
  };
  const browserWindow = { devicePixelRatio };

  return { browserWindow, calls, canvas };
};

const withWindow = (browserWindow, callback) => {
  const previousWindow = globalThis.window;
  globalThis.window = browserWindow;
  try {
    callback();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
};

test("ordinary static updates avoid layout and draw once", () => {
  const harness = createHarness();
  withWindow(harness.browserWindow, () => {
    const renderer = createWebGLMeshRenderer(harness.canvas, { maxPixelRatio: 1 });
    assert.ok(renderer);
    renderer.start();
    harness.calls.draws = 0;
    harness.calls.rects = 0;

    renderer.update({ opacity: 0.4 });

    assert.equal(harness.calls.rects, 0);
    assert.equal(harness.calls.draws, 1);
  });
});

test("resolution-affecting updates resize and draw static output once", () => {
  const harness = createHarness();
  withWindow(harness.browserWindow, () => {
    const renderer = createWebGLMeshRenderer(harness.canvas, { maxPixelRatio: 1 });
    assert.ok(renderer);
    renderer.start();
    harness.calls.draws = 0;
    harness.calls.rects = 0;

    renderer.update({ maxPixelRatio: 1.5 });

    assert.equal(harness.calls.rects, 1);
    assert.equal(harness.calls.draws, 1);
    assert.equal(harness.canvas.width, 150);
    assert.equal(harness.canvas.height, 60);
  });
});

test("updates detect device pixel ratio and motion resolution changes", () => {
  const harness = createHarness({ devicePixelRatio: 1 });
  withWindow(harness.browserWindow, () => {
    const renderer = createWebGLMeshRenderer(harness.canvas, {
      maxPixelRatio: 3,
      motionMaxPixelRatio: 0.5,
    });
    assert.ok(renderer);
    harness.calls.rects = 0;

    harness.browserWindow.devicePixelRatio = 2;
    renderer.update({ opacity: 0.4 });
    assert.equal(harness.calls.rects, 1);
    assert.equal(harness.canvas.width, 200);

    harness.calls.rects = 0;
    renderer.update({ motionPreset: "drift", motionSpeed: 50 });
    assert.equal(harness.calls.rects, 1);
    assert.equal(harness.canvas.width, 50);

    harness.calls.rects = 0;
    renderer.update({ motionMaxPixelRatio: 0.75 });
    assert.equal(harness.calls.rects, 1);
    assert.equal(harness.canvas.width, 75);
  });
});

test("option replacement resets omissions without changing update patch semantics", () => {
  const harness = createHarness();
  withWindow(harness.browserWindow, () => {
    const renderer = createWebGLMeshRenderer(harness.canvas, {
      maxPixelRatio: 2,
      opacity: 0.8,
    });
    assert.ok(renderer);

    renderer.update({ contrast: 2 });
    assert.equal(harness.calls.uniforms.get("u_grainOpacity"), 0.8);
    assert.equal(harness.canvas.width, 200);

    renderer.replaceOptions({ contrast: 2 });
    assert.equal(harness.calls.uniforms.get("u_grainOpacity"), 0.2);
    assert.equal(harness.canvas.width, 125);
  });
});
