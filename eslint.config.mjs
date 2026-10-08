import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

// Ana depodaki gibi SonarJS önerilen kuralları hata düzeyinde.
const sonarRules = Object.fromEntries(
  Object.entries(sonarjs.configs.recommended.rules).map(([rule, setting]) => {
    const [level, ...options] = Array.isArray(setting) ? setting : [setting];
    return [
      rule,
      level === "off" || level === 0 ? "off" : ["error", ...options],
    ];
  }),
);

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { plugins: { sonarjs }, rules: sonarRules },
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "reports/**"]),
]);
