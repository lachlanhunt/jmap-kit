import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importPlugin from "eslint-plugin-import";
import { defineConfig } from "eslint/config";
import globals from "globals";
import { configs as tseslintConfigs } from "typescript-eslint";

export default defineConfig(
    { files: ["**/*.{js,mjs,cjs,ts}"] },
    {
        languageOptions: {
            globals: globals.node,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    pluginJs.configs.recommended,
    // tseslintConfigs.recommended,
    tseslintConfigs.recommendedTypeChecked,
    // tseslintConfigs.strict,
    tseslintConfigs.strictTypeChecked,
    // tseslintConfigs.stylistic,
    tseslintConfigs.stylisticTypeChecked,
    {
        rules: {
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/consistent-indexed-object-style": "off",
            "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
            "@typescript-eslint/class-literal-property-style": ["error", "getters"],
            "@typescript-eslint/no-invalid-void-type": ["error", { allowAsThisParameter: true }],
            "@typescript-eslint/no-unnecessary-condition": [
                "error",
                { allowConstantLoopConditions: "only-allowed-literals" },
            ],
            "@typescript-eslint/no-confusing-void-expression": [
                "error",
                { ignoreArrowShorthand: true, ignoreVoidOperator: true },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    args: "all",
                    argsIgnorePattern: "^_",
                    caughtErrors: "all",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    ignoreRestSiblings: true,
                },
            ],
            eqeqeq: ["error", "always"],
        },
    },

    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    {
        settings: {
            "import/parsers": {
                "@typescript-eslint/parser": [".ts", ".tsx"],
            },
            "import/resolver": {
                typescript: {},
            },
            "import/resolver-next": [
                createTypeScriptImportResolver({
                    alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
                }),
            ],
        },
    },
    // Add override to ignore .pnp.* files and everything in the .yarn directory in the root
    {
        ignores: [".pnp.*", ".yarn/**", "dist/**", "coverage/**", "docs/**"],
    },
    // Add override for test files to disable unsafe assignment/call/member-access rules
    {
        files: ["**/*.test.ts", "**/*.test.js"],
        rules: {
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
        },
    },
    {
        files: ["**/*.d.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
    eslintConfigPrettier,
);
