// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  ...storybook.configs["flat/recommended"],
  {
    files: ["app/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[\\da-fA-F]{3,8}(?:\\b|\\])/]",
          message: "Use design tokens instead of hardcoded hex colours.",
        },
        {
          selector: "TemplateElement[value.raw=/#[\\da-fA-F]{3,8}(?:\\b|\\])/]",
          message: "Use design tokens instead of hardcoded hex colours.",
        },
        {
          selector:
            "Literal[value=/\\b(?:bg|text|border|ring|fill|stroke)-\\[(?:rgb|hsl|hwb|lab|lch|oklab|oklch|color|var)/]",
          message:
            "Use semantic color utilities instead of arbitrary color values.",
        },
        {
          selector:
            "TemplateElement[value.raw=/\\b(?:bg|text|border|ring|fill|stroke)-\\[(?:rgb|hsl|hwb|lab|lch|oklab|oklch|color|var)/]",
          message:
            "Use semantic color utilities instead of arbitrary color values.",
        },
      ],
    },
  },
]);

export default eslintConfig;
