import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import i18nextPlugin from "eslint-plugin-i18next";

/**
 * A shared ESLint configuration for React applications.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      i18next: i18nextPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // i18n: Warn when hardcoded strings are used in JSX instead of t()
      "i18next/no-literal-string": [
        "warn",
        {
          markupOnly: true,
          ignoreAttribute: [
            "className",
            "style",
            "type",
            "id",
            "name",
            "data-testid",
            "aria-label",
            "aria-labelledby",
            "aria-describedby",
            "role",
            "href",
            "src",
            "alt",
            "for",
            "key",
            "variant",
            "size",
            "color",
            "placeholder",
            "value",
          ],
          ignore: [
            // Ignore numbers
            "^[0-9]+$",
            // Ignore constants (UPPER_CASE)
            "^[A-Z_]+$",
            // Ignore single characters
            "^.$",
            // Ignore paths
            "^/",
            // Ignore hash routes
            "^#",
            // Ignore CSS values
            "^(px|em|rem|%|vh|vw)$",
          ],
        },
      ],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ["dist/**", "build/**"],
  },
];