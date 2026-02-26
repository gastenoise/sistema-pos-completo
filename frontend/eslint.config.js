import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: ["dist/**", "node_modules/**", "src/utils/index.ts"],
    extends: [
      pluginJs.configs.recommended,
      ...tseslint.configs.recommended,
      pluginReact.configs.flat.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "src/components/**/*.{js,jsx,ts,tsx}",
      "src/pages/**/*.{js,jsx,ts,tsx}",
      "src/Layout.jsx",
      "src/App.jsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value='America/Argentina/Buenos_Aires']",
          message:
            "No hardcodees timezone de Argentina en UI; usa helpers de src/lib/dateTime.js.",
        },
        {
          selector:
            "CallExpression[callee.property.name='toLocaleDateString']",
          message:
            "No uses toLocaleDateString directamente en UI; usa helpers de src/lib/dateTime.js.",
        },
        {
          selector:
            "CallExpression[callee.property.name='toLocaleString']",
          message:
            "No uses toLocaleString directamente en UI; usa helpers de src/lib/dateTime.js.",
        },
        {
          selector:
            "NewExpression[callee.object.name='Intl'][callee.property.name='DateTimeFormat']",
          message:
            "No uses Intl.DateTimeFormat directamente en UI; usa helpers de src/lib/dateTime.js.",
        },
      ],
    },
  },
  {
    files: [
      "src/pages/**/*.{js,jsx,ts,tsx}",
      "src/components/pos/**/*.{js,jsx,ts,tsx}",
      "src/modules/**/*.{js,jsx,ts,tsx}",
    ],
    rules: {
      "max-lines": [
        "warn",
        {
          max: 400,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      complexity: ["warn", 12],
      "max-depth": ["warn", 4],
    },
  },
  {
    files: ["src/components/ui/**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Primitivas compartidas (shadcn/ui) con wrappers de composición;
      // reducimos límites de tamaño/complejidad para evitar ruido en código generado.
      "max-lines": "off",
      complexity: "off",
      "max-depth": "off",
    },
  },
);
