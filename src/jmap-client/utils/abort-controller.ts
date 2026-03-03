/**
 * Creates an AbortController that is managed internally, but will also be aborted
 * if the provided external signal is aborted.
 *
 * @param externalSignal An optional AbortSignal from the consumer.
 * @returns The internally managed AbortController.
 */
export function createAbortController(externalSignal?: AbortSignal): AbortController {
    const controller = new AbortController();
    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort();
        } else {
            const onAbort = () => controller.abort();
            externalSignal.addEventListener("abort", onAbort, { once: true });
            controller.signal.addEventListener("abort", () => {
                externalSignal.removeEventListener("abort", onAbort);
            });
        }
    }
    return controller;
}
