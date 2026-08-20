import {
  createWebGLMeshRenderer,
  type ReplaceableWebGLMeshRenderer,
  type WebGLMeshGradientOptions,
  type WebGLMeshRenderer,
} from "../src/webgl.js";

type Assert<Condition extends true> = Condition;

const legacyRenderer = {
  canvas: {} as HTMLCanvasElement,
  update(_options: WebGLMeshGradientOptions) {},
  start() {},
  stop() {},
  resize() {},
  destroy() {},
} satisfies WebGLMeshRenderer;

type LegacyInterfaceHasNoReplacement = Assert<
  "replaceOptions" extends keyof WebGLMeshRenderer ? false : true
>;
type FactoryReturnsReplaceableRenderer = Assert<
  NonNullable<ReturnType<typeof createWebGLMeshRenderer>> extends ReplaceableWebGLMeshRenderer
    ? true
    : false
>;

void legacyRenderer;
export type { FactoryReturnsReplaceableRenderer, LegacyInterfaceHasNoReplacement };
