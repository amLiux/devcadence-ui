import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["error", "warn", "info"] }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/components/ui/**",
      "src/app/**/docs/**",
      "**/*.test.{ts,tsx}",
    ],
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": [
        "error",
        { max: 180, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["error", 15],
      "max-statements": ["error", 30],
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
    },
  },
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**", "src/app/**/docs/**", "**/*.test.tsx"],
    rules: {
      "react/no-multi-comp": ["error", { ignoreStateless: false }],
    },
  },
]);

export default eslintConfig;
