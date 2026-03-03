export function assertNonNullish<T>(value: T, label: string): asserts value is NonNullable<T> {
    if (value === null || value === undefined) {
        throw new Error(`${label} is null or undefined`);
    }
}
