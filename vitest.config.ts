import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        setupFiles: ["test/setup.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: [
                "src/**/*.test.ts",
                "src/**/*.typestest.ts",
                "src/**/types.ts",
                "src/**/test-utils.ts",
                "src/index.ts",
            ],
            reporter: ["text", "lcov"],
        },
    },
});
