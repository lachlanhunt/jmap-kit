/**
 * A utility type that makes all properties of T optional recursively
 *
 * @template T - The type to make partially optional
 * @template Depth - Maximum recursion depth (default: 5)
 * @returns A new type where all properties of T are optional, recursively down to the specified
 *          depth for nested objects
 */
export type DeepPartial<T, Depth extends number = 5> = [Depth] extends [0]
    ? T
    : T extends object
      ? {
            [P in keyof T]?: T[P] extends (infer U)[]
                ? DeepPartial<U, Decrement<Depth>>[]
                : Extract<T[P], object> extends object
                  ? DeepPartial<T[P], Decrement<Depth>>
                  : T[P];
        }
      : T;

/**
 * Utility type to build a tuple of length L
 * @template L - The desired length of the tuple. The length must be >= 0.
 *               TypeScript limits tuples to a maximum length of 999.
 * @template T - The type of each element in the tuple (default: unknown)
 * @returns A tuple of length L with elements of type T, or never if L is negative.
 */
export type BuildTuple<L extends number, T extends unknown[] = []> = T["length"] extends L
    ? T
    : IsNegative<L> extends true
      ? never
      : BuildTuple<L, [unknown, ...T]>;

/**
 * Utility type to check if a number is negative
 * @template N - The number to check
 * @returns true if N is negative, false otherwise
 */
export type IsNegative<N extends number> = `${N}` extends `-${string}` ? true : false;

/**
 * Utility type to decrement a number by 1
 * @template N - The positive number to decrement. If N is 0, it returns never.
 *               If N is a negative number, it returns never.
 * @returns The decremented number, or never if N is negative or 0.
 */
export type Decrement<N extends number> =
    IsNegative<N> extends true ? never : BuildTuple<N> extends [infer _, ...infer Rest] ? Rest["length"] : never;
