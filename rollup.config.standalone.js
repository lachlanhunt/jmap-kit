// rollup.config.standalone.js - Bundle everything including dependencies
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

function createConfig(mode) {
    const isDev = mode === "development";
    return {
        input: "src/index.ts",
        output: {
            file: isDev ? "dist/standalone.development.js" : "dist/standalone.production.js",
            format: "es",
            sourcemap: true,
            plugins: isDev ? [] : [terser()],
        },
        external: (/** @type {string} */ _id) => {
            // Bundle dependencies in standalone, but keep platform APIs external
            // This can be adjusted if needed for true standalone builds
            return false;
        },
        plugins: [
            nodeResolve(), // Bundles dependencies
            typescript({
                tsconfig: "./tsconfig.rollup.json",
            }),
        ],
    };
}

export default [createConfig("development"), createConfig("production")];
