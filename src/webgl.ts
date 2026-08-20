import type { GrainOptions, MeshGradientOptions, MotionOptions } from "./core.js";
import { clamp, motionPresets, normalizeMotion, normalizeSwirl } from "./internal.js";

export interface WebGLMeshGradientOptions extends MeshGradientOptions, MotionOptions, GrainOptions {
  maxPixelRatio?: number;
  motionMaxPixelRatio?: number;
  fps?: number;
  pauseWhenHidden?: boolean;
}

export interface ResolvedWebGLMeshGradientOptions {
  colors: [string, string, string, string, string, string];
  colorCount: number;
  baseColor: string;
  saturation: number;
  swirl: number;
  motionPreset: MotionOptions["motionPreset"];
  motionSpeed: number;
  motionIntensity: number;
  grainOpacity: number;
  grainScale: number;
  grainContrast: number;
  grainSeed: number;
  maxPixelRatio: number;
  motionMaxPixelRatio: number;
  fps: number;
  pauseWhenHidden: boolean;
}

export interface WebGLMeshRenderer {
  readonly canvas: HTMLCanvasElement;
  update(options: WebGLMeshGradientOptions): void;
  start(): void;
  stop(): void;
  resize(): void;
  destroy(): void;
}

const DEFAULT_COLORS = ["#7c3aed", "#06b6d4", "#f97316", "#f43f5e"];
const BLOB_POSITIONS = [0.12, 0.18, 0.86, 0.16, 0.7, 0.82, 0.2, 0.88, 0.5, 0.46, 0.18, 0.56];
const BLOB_SIZES = [0.34, 0.32, 0.36, 0.32, 0.3, 0.28];
const TAU = 6.2831853;

const normalizeGrainSeed = (seed: number): number => {
  const n = Math.floor(clamp(seed, 0, 9999));
  // Deterministic integer hash mapped to [0, 1). The fragment shader uses
  // mediump floats, so the seed must stay small to avoid destroying
  // fractional precision in the hash arithmetic.
  return ((n * 9301 + 49297) % 233280) / 233280;
};

const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = vec2(a_position.x * 0.5 + 0.5, 1.0 - (a_position.y * 0.5 + 0.5));
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_saturation;
uniform float u_frameRotationSin;
uniform float u_frameRotationCos;
uniform float u_frameScale;
uniform vec2 u_frameTravel;
uniform float u_grainOpacity;
uniform float u_grainScale;
uniform float u_grainContrast;
uniform float u_grainSeed;
uniform vec3 u_baseColor;
uniform vec3 u_colors[6];
uniform int u_colorCount;
uniform vec2 u_positions[6];
uniform float u_sizes[6];

vec3 saturateColor(vec3 color, float amount) {
  float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(gray), color, amount);
}

vec2 rotate2d(vec2 value, float s, float c) {
  return mat2(c, -s, s, c) * value;
}

float hash(vec2 point) {
  vec3 value = fract(vec3(point.xyx) * 0.1031);
  value += dot(value, value.yzx + 33.33 + u_grainSeed);
  return fract((value.x + value.y) * value.z);
}

float grain(vec2 point) {
  vec2 cell = floor(point * u_grainScale);
  float noise = hash(cell) * 2.0 - 1.0;
  return clamp(noise * u_grainContrast, -1.0, 1.0);
}

vec3 overlayBlend(vec3 base, vec3 blend) {
  vec3 low = 2.0 * base * blend;
  vec3 high = 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
  return mix(low, high, step(vec3(0.5), base));
}

void main() {
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  vec2 uv = v_uv;
  vec2 centered = uv - 0.5;
  centered = rotate2d(centered, u_frameRotationSin, u_frameRotationCos) / u_frameScale;
  uv = centered + 0.5 + u_frameTravel;

  float t = clamp((uv.x + uv.y) * 0.5, 0.0, 1.0);
  float segment = t * max(float(u_colorCount - 1), 1.0);
  int index = int(floor(segment));
  float local = fract(segment);
  vec3 color = u_colors[0];
  if (index <= 0) {
    color = mix(u_colors[0], u_colorCount > 1 ? u_colors[1] : u_colors[0], local);
  } else if (index == 1) {
    color = mix(u_colors[1], u_colorCount > 2 ? u_colors[2] : u_colors[1], local);
  } else if (index == 2) {
    color = mix(u_colors[2], u_colorCount > 3 ? u_colors[3] : u_colors[2], local);
  } else if (index == 3) {
    color = mix(u_colors[3], u_colorCount > 4 ? u_colors[4] : u_colors[3], local);
  } else if (index == 4) {
    color = mix(u_colors[4], u_colorCount > 5 ? u_colors[5] : u_colors[4], local);
  } else {
    color = u_colors[5];
  }
  color = mix(u_baseColor, color, 0.86);

  for (int layer = 5; layer >= 0; layer--) {
    if (layer >= u_colorCount) {
      continue;
    }
    vec2 point = u_positions[layer];
    vec2 delta = (uv - point) * aspect;
    float radius = u_sizes[layer] * max(aspect.x, aspect.y) * 1.35;
    float blob = clamp(1.0 - length(delta) / max(radius, 0.001), 0.0, 1.0);
    float opacity = 0.72;
    if (layer == 0) {
      opacity = 0.52;
    } else if (layer == 1) {
      opacity = 0.68;
    } else if (layer == 2) {
      opacity = 0.86;
    } else if (layer == 3) {
      opacity = 1.0;
    }
    color = mix(color, u_colors[layer], blob * opacity);
  }

  color = saturateColor(color, u_saturation);

  float noise = grain(gl_FragCoord.xy / max(min(u_resolution.x, u_resolution.y), 1.0));
  vec3 grainColor = vec3(0.5 + noise * 0.5);
  color = mix(color, overlayBlend(color, grainColor), u_grainOpacity);

  gl_FragColor = vec4(color, 1.0);
}
`;

let colorParserContext: CanvasRenderingContext2D | null | undefined;

const getColorParserContext = () => {
  if (colorParserContext !== undefined) return colorParserContext;
  if (typeof document === "undefined") {
    colorParserContext = null;
    return colorParserContext;
  }
  colorParserContext = document.createElement("canvas").getContext("2d");
  return colorParserContext;
};

const parseHexColor = (color: string): [number, number, number] => {
  const normalized = color.trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => part + part)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    const context = getColorParserContext();
    if (!context) return [1, 1, 1];
    context.fillStyle = "#ffffff";
    context.fillStyle = normalized;
    if (context.fillStyle === normalized && !normalized.startsWith("#")) return [1, 1, 1];
    return parseHexColor(context.fillStyle);
  }
  const value = Number.parseInt(expanded, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

export function resolveWebGLMeshGradientOptions(
  options: WebGLMeshGradientOptions = {},
): ResolvedWebGLMeshGradientOptions {
  const colors = options.colors?.length ? options.colors : DEFAULT_COLORS;
  const stops = colors.slice(0, 6);
  const resolved = Array.from(
    { length: 6 },
    (_, index) => stops[index] ?? stops[stops.length - 1] ?? DEFAULT_COLORS[0],
  ) as [string, string, string, string, string, string];

  return {
    colors: resolved,
    colorCount: Math.max(1, stops.length),
    baseColor: options.baseColor ?? "#0b1020",
    saturation: clamp(options.saturation ?? options.intensity ?? 1.18, 0.2, 2.5),
    swirl: clamp(options.swirl ?? 0, 0, 100),
    motionPreset: motionPresets.has(options.motionPreset ?? "none")
      ? (options.motionPreset ?? "none")
      : "none",
    motionSpeed: clamp(options.motionSpeed ?? 0, 0, 100),
    motionIntensity: clamp(options.motionIntensity ?? 50, 0, 100),
    grainOpacity: clamp(options.opacity ?? 0.2, 0, 1),
    grainScale: clamp(options.frequency ?? options.baseFrequency ?? 1.25, 0.04, 2.4) * 520,
    grainContrast: clamp(options.contrast ?? 1.7, 1, 2.5),
    grainSeed: normalizeGrainSeed(options.seed ?? 1),
    maxPixelRatio: clamp(options.maxPixelRatio ?? 1.25, 0.5, 3),
    motionMaxPixelRatio: clamp(
      options.motionMaxPixelRatio ?? Math.min(options.maxPixelRatio ?? 1.25, 0.75),
      0.5,
      3,
    ),
    fps: clamp(options.fps ?? 30, 1, 60),
    pauseWhenHidden: options.pauseWhenHidden ?? true,
  };
}

export function isWebGLAvailable() {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
}

const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create WebGL shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "WebGL shader compilation failed.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext) => {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create WebGL program.");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "WebGL program linking failed.";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
};

export function createWebGLMeshRenderer(
  canvas: HTMLCanvasElement,
  initialOptions: WebGLMeshGradientOptions = {},
): WebGLMeshRenderer | null {
  try {
    const gl = (canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    }) ||
      canvas.getContext("experimental-webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
      })) as WebGLRenderingContext | null;
    if (!gl) return null;

    const program = createProgram(gl);
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Could not create WebGL buffer.");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      saturation: gl.getUniformLocation(program, "u_saturation"),
      frameRotationSin: gl.getUniformLocation(program, "u_frameRotationSin"),
      frameRotationCos: gl.getUniformLocation(program, "u_frameRotationCos"),
      frameScale: gl.getUniformLocation(program, "u_frameScale"),
      frameTravel: gl.getUniformLocation(program, "u_frameTravel"),
      grainOpacity: gl.getUniformLocation(program, "u_grainOpacity"),
      grainScale: gl.getUniformLocation(program, "u_grainScale"),
      grainContrast: gl.getUniformLocation(program, "u_grainContrast"),
      grainSeed: gl.getUniformLocation(program, "u_grainSeed"),
      baseColor: gl.getUniformLocation(program, "u_baseColor"),
      colors: gl.getUniformLocation(program, "u_colors"),
      colorCount: gl.getUniformLocation(program, "u_colorCount"),
      positions: gl.getUniformLocation(program, "u_positions"),
      sizes: gl.getUniformLocation(program, "u_sizes"),
    };

    let rawOptions: WebGLMeshGradientOptions = { ...initialOptions };
    let options = resolveWebGLMeshGradientOptions(rawOptions);
    let animationFrame = 0;
    let running = false;
    let lastFrame = 0;
    let pixelRatio = 0;
    let startTime = performance.now();
    let motion = normalizeMotion(options);
    let motionDuration = Math.max(motion.duration, 1);
    let motionAmount = motion.enabled ? options.motionIntensity / 100 : 0;
    let swirl = normalizeSwirl(options.swirl);
    let swirlOffset = swirl.value * 0.0012;
    let swirlAngle = swirl.value * 0.0022;
    let swirlScale = 1.0 + swirl.value * 0.004;
    let rotateRad = 0;
    let zoom = 1;
    let travel = 0;
    const animatedPositions = new Float32Array(BLOB_POSITIONS.length);
    const animatedSizes = new Float32Array(BLOB_SIZES.length);

    const updateAnimatedGeometry = (time: number) => {
      const cycle = time * TAU;
      for (let layer = 0; layer < BLOB_SIZES.length; layer++) {
        const index = layer * 2;
        animatedPositions[index] =
          BLOB_POSITIONS[index] + swirlOffset * Math.sin(layer + cycle) * motionAmount;
        animatedPositions[index + 1] =
          BLOB_POSITIONS[index + 1] - swirlOffset * Math.cos(layer + time * 4.2) * motionAmount;

        const radiusBoost = layer === 2 ? 1.28 : 1;
        animatedSizes[layer] =
          BLOB_SIZES[layer] * radiusBoost * (1 + motionAmount * 0.1 * Math.sin(cycle + layer));
      }

      gl.uniform2fv(uniforms.positions, animatedPositions);
      gl.uniform1fv(uniforms.sizes, animatedSizes);
    };

    const cancelLoop = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const time = elapsed / motionDuration;
      const wave = Math.sin(time * TAU);
      const orbit = Math.cos(time * TAU);
      const frameAngle = swirlAngle + rotateRad * wave;
      const frameScale = swirlScale * Math.max(zoom + motionAmount * wave * 0.04, 0.1);
      const frameTravelX = travel * wave;
      const frameTravelY = travel * orbit;
      gl.useProgram(program);
      gl.uniform1f(uniforms.frameRotationSin, Math.sin(frameAngle));
      gl.uniform1f(uniforms.frameRotationCos, Math.cos(frameAngle));
      gl.uniform1f(uniforms.frameScale, frameScale);
      gl.uniform2f(uniforms.frameTravel, frameTravelX, frameTravelY);
      updateAnimatedGeometry(time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const requestLoop = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(draw);
    };

    const setStaticUniforms = () => {
      motion = normalizeMotion(options);
      motionDuration = Math.max(motion.duration, 1);
      swirl = normalizeSwirl(options.swirl);
      motionAmount = motion.enabled ? options.motionIntensity / 100 : 0;
      swirlOffset = swirl.value * 0.0012;
      swirlAngle = swirl.value * 0.0022;
      swirlScale = 1.0 + swirl.value * 0.004;
      rotateRad = (Number(motion.rotate) * Math.PI) / 180;
      zoom = motion.enabled ? Number(motion.zoom) : 1;
      travel = motion.enabled ? Number(motion.travel) / 100 : 0;
      const colorValues = options.colors.flatMap(parseHexColor);
      const baseColor = parseHexColor(options.baseColor);
      gl.useProgram(program);
      gl.uniform1f(uniforms.saturation, options.saturation);
      gl.uniform1f(uniforms.grainOpacity, options.grainOpacity);
      gl.uniform1f(uniforms.grainScale, options.grainScale);
      gl.uniform1f(uniforms.grainContrast, options.grainContrast);
      gl.uniform1f(uniforms.grainSeed, options.grainSeed);
      gl.uniform3fv(uniforms.baseColor, baseColor);
      gl.uniform3fv(uniforms.colors, colorValues);
      gl.uniform1i(uniforms.colorCount, options.colorCount);
      updateAnimatedGeometry(0);
    };

    const draw = (now: number) => {
      animationFrame = 0;
      if (!running) return;
      if (!motion.enabled) return;
      requestLoop();
      if (options.pauseWhenHidden && typeof document !== "undefined" && document.hidden) return;

      const minFrameTime = 1000 / options.fps;
      if (now - lastFrame < minFrameTime) return;
      lastFrame = now;

      render(now);
    };

    const resolvePixelRatio = () => {
      const pixelRatioLimit = motion.enabled ? options.motionMaxPixelRatio : options.maxPixelRatio;
      return Math.min(window.devicePixelRatio || 1, pixelRatioLimit);
    };

    const renderer: WebGLMeshRenderer = {
      canvas,
      update(nextOptions) {
        const wasMotionEnabled = motion.enabled;
        rawOptions = { ...rawOptions, ...nextOptions };
        options = resolveWebGLMeshGradientOptions(rawOptions);
        setStaticUniforms();
        const needsResize = pixelRatio !== resolvePixelRatio();
        if (needsResize) renderer.resize();
        if (!running) return;
        if (motion.enabled) {
          if (!wasMotionEnabled || !animationFrame) {
            startTime = performance.now();
            lastFrame = 0;
          }
          requestLoop();
        } else {
          cancelLoop();
          if (!needsResize) render(performance.now());
        }
      },
      start() {
        if (running) return;
        running = true;
        startTime = performance.now();
        lastFrame = 0;
        if (motion.enabled) requestLoop();
        else render(startTime);
      },
      stop() {
        running = false;
        cancelLoop();
      },
      resize() {
        const rect = canvas.getBoundingClientRect();
        pixelRatio = resolvePixelRatio();
        const width = Math.max(1, Math.round(rect.width * pixelRatio));
        const height = Math.max(1, Math.round(rect.height * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        gl.useProgram(program);
        gl.uniform2f(uniforms.resolution, width, height);
        if (running && !motion.enabled) render(performance.now());
      },
      destroy() {
        renderer.stop();
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      },
    };

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    setStaticUniforms();
    renderer.resize();
    return renderer;
  } catch {
    return null;
  }
}
