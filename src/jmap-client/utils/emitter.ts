import type { EventEmitterFn, JMAPClientEvents } from "../types.js";

/**
 * Create a safe event emitter function that wraps an external emitter implementation.
 * The returned function wraps the emitter in try/catch to prevent errors in the emitter from affecting the application.
 *
 * @param getCurrentEmitter A function that returns the current emitter implementation
 * @returns A safe event emitter function
 */
export function createEmitter(getCurrentEmitter: () => EventEmitterFn | undefined): EventEmitterFn {
    return <E extends keyof JMAPClientEvents>(name: E, payload: JMAPClientEvents[E]) => {
        try {
            getCurrentEmitter()?.(name, payload);
        } catch {
            // Ignore any errors from the external emitter
        }
    };
}
