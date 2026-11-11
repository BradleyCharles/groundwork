import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "golden/**", "template/**", "modules/**", "node_modules/**", ".validation/**"] },
  js.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", Buffer: "readonly", URL: "readonly" },
    },
  },
  ...tseslint.configs.recommended,
);
