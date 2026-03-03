import "vitest";

declare module "vitest" {
    interface Matchers<T = any> {
        toHaveHeaders: (expected: Record<string, string>) => T;
    }
}
