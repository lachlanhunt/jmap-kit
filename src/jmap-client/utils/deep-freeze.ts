/**
 * Deep freeze an object and all nested objects/functions within it.
 * @template T - The type of the object to freeze.
 * @param o - The object to deeply freeze.
 * @returns The deeply frozen (immutable) object.
 */
export function deepFreeze<T extends object>(o: T): Readonly<T> {
    const propNames = Reflect.ownKeys(o);
    for (const name of propNames) {
        const value = o[name as keyof typeof o] as unknown;
        if ((value && typeof value === "object") || typeof value === "function") {
            deepFreeze(value);
        }
    }
    return Object.freeze(o);
}
