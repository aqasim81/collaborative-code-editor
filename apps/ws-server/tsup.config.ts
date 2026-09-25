import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: true,
  // The shared package ships TypeScript source only, so Node cannot load it at runtime: inline it.
  noExternal: ["@collab-editor/shared"],
});
