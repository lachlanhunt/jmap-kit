import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { visualizer } from "rollup-plugin-visualizer";

const isProduction = process.env.NODE_ENV === "production";

export default {
    input: "src/index.ts",
    output: {
        file: "dist/jmap-kit.bundle.js",
        format: "es",
        sourcemap: true,
        plugins: [terser()],
    },
    external: (/** @type {string} */ id) => {
        // Keep dependencies external (including subpath imports like zod/v4)
        return id === "p-limit" || id === "url-template" || id.startsWith("zod");
    },
    plugins: [
        nodeResolve(),
        typescript({
            tsconfig: "./tsconfig.rollup.json",
        }),
        isProduction &&
            visualizer({
                filename: "bundle-analysis.html",
                open: true,
            }),
    ].filter(Boolean),
};
