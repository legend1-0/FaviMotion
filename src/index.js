/**
 * @module favicon-motion
 * Public entry point. Only re-exports the pieces meant for consumer/plugin
 * use — everything else is an internal implementation detail and may change
 * without a major version bump.
 */

export { Favicon } from "./core/Favicon.js";
export { builtinEffects } from "./effects/index.js";

// Exported for advanced/plugin use (custom sources, testing, etc.)
export { assertValidSource } from "./sources/Source.js";
export { FrameListSource } from "./sources/FrameListSource.js";
export { SpriteSheetSource } from "./sources/SpriteSheetSource.js";
export { ProceduralSource } from "./sources/ProceduralSource.js";
export { VideoSource } from "./sources/VideoSource.js";
export { LottieSource } from "./sources/LottieSource.js";
export { DotLottieSource } from "./sources/DotLottieSource.js";
export { EventEmitter } from "./utils/EventEmitter.js";
