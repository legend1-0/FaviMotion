import { defineConfig } from "rollup";
import terser from "@rollup/plugin-terser";

/**
 * Three output targets so favicon-motion works everywhere:
 *  - ESM: modern bundlers, tree-shaking friendly (sideEffects: false in package.json)
 *  - CJS: legacy Node / bundlers that still expect require()
 *  - UMD: drop-in <script> tag usage via a CDN, exposes `window.FaviconMotion`
 *
 * Video, Lottie, and dotLottie sources all live in this single bundle —
 * they're core methods (fromVideo/fromLottie/fromDotLottie), not separate
 * plugins. Video costs nothing extra (native <video>, no dependency at
 * all). The Lottie/dotLottie *wrapper* classes are a few hundred bytes
 * each; the actual heavy decoders (lottie-web, @lottiefiles/dotlottie-web)
 * are never imported here; they're only bundled into a consumer's app if
 * that consumer installs and imports them, matching the peerDependencies
 * declared in package.json.
 */
export default defineConfig({
  input: "src/index.js",
  output: [
    {
      file: "dist/favicon-motion.esm.js",
      format: "es",
      sourcemap: true,
    },
    {
      file: "dist/favicon-motion.cjs.js",
      format: "cjs",
      sourcemap: true,
      exports: "named",
    },
    {
      file: "dist/favicon-motion.umd.js",
      format: "umd",
      name: "FaviconMotion",
      sourcemap: true,
    },
    {
      file: "dist/favicon-motion.umd.min.js",
      format: "umd",
      name: "FaviconMotion",
      sourcemap: true,
      plugins: [terser()],
    },
  ],
});
