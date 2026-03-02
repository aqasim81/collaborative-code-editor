const config = {
  "*.{js,mjs,mts,ts,tsx,json}": ["biome check --write --no-errors-on-unmatched"],
  "*.{ts,tsx}": () => "tsc --noEmit",
};

export default config;
