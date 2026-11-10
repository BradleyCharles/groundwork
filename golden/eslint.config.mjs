import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { ...jsxA11y.flatConfigs.recommended.rules, "react/no-danger": "error" } },
  globalIgnores([".next/**", "out/**", "next-env.d.ts"]),
]);
