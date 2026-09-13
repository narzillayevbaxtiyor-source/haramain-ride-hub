// Production build config for Google Cloud Run (Node.js runtime).
//
// The default vite.config.ts targets Cloudflare (Lovable preview/publish).
// This config reuses the exact same app, plugins and SSR entry (src/server.ts)
// but asks Nitro for the `node-server` preset, which emits a plain Node HTTP
// server at .output/server/index.mjs that binds HOST/PORT.
//
// Build:  npm run build:node
// Start:  npm start   (binds 0.0.0.0 and uses process.env.PORT, default 8080)
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
    // Pin the output paths so `npm start` (.output/server/index.mjs) always matches.
    output: {
      dir: ".output",
      serverDir: ".output/server",
      publicDir: ".output/public",
    },
  },
});
