import type { Mocked } from "vitest";
import { Core } from "../capabilities/core/core.js";
import type { JMAPRequestErrorTypes, ProblemDetails } from "../common/types.js";
import { RequestBuilder } from "../request-builder/request-builder.js";
import { createMockClient } from "../request-builder/test-utils.js";
import type { ClientContext, Logger, Transport, TransportRequestOptions } from "./types.js";
import { JMAPRequestError } from "./utils/jmap-request-error.js";

export function expectURL(input: unknown): asserts input is URL {
    expect(input).toBeInstanceOf(URL);
}

export function createMockTransport({
    getResponse,
    postResponse,
}: { getResponse?: unknown; postResponse?: unknown } = {}): Mocked<Transport> {
    return {
        get: vi.fn().mockResolvedValue(getResponse ?? {}),
        post: vi.fn().mockResolvedValue(postResponse ?? {}),
    };
}

/**
 * Creates a mock transport that throws a JMAPRequestError with the provided problem details
 */
export function createErrorTransport(problemDetails: ProblemDetails<JMAPRequestErrorTypes>): Mocked<Transport> {
    return createMockTransport({ postResponse: Promise.reject(new JMAPRequestError(problemDetails)) });
}

export function makeAbortError() {
    return new DOMException("Aborted", "AbortError");
}

function addAbortListener(signal: AbortSignal, reject: (err: Error) => void) {
    signal.addEventListener("abort", () => reject(makeAbortError()), { once: true });
}

export function createMockAbortableTransport({
    getResponse,
    postResponse,
}: { getResponse?: unknown; postResponse?: unknown } = {}): Mocked<Transport> {
    function abortableImpl(response: unknown) {
        return (url: string | URL, opts?: TransportRequestOptions) => {
            return new Promise((resolve, reject) => {
                if (opts?.signal?.aborted) {
                    reject(makeAbortError()); // NOSONAR
                } else if (opts?.signal) {
                    addAbortListener(opts.signal, reject);
                    /* istanbul ignore else -- If a test reaches this, it's broken */
                } else {
                    console.error(
                        "No signal provided, request will not be aborted. If you see this message, the test is broken",
                        url,
                        opts,
                    );
                    resolve(response ?? {});
                }
            });
        };
    }
    return {
        get: vi.fn(abortableImpl(getResponse)),
        post: vi.fn(abortableImpl(postResponse)),
    } as Mocked<Transport>;
}

export function createMockLogger(): Mocked<Logger> {
    return {
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        log: vi.fn(),
    };
}

export function createMockClientContext(): Mocked<ClientContext> {
    const mockLogger = createMockLogger();
    const mockEmitter = vi.fn();

    return {
        logger: mockLogger,
        emitter: mockEmitter,
    };
}

export function createEchoRequestAndResponse(sessionState = "cyrus-0123456;p-0123456789") {
    const mockClient = createMockClient();
    const mockRequest = new RequestBuilder(mockClient, createMockClientContext());
    mockRequest
        .add(
            Core.request.echo({
                arg2: "arg2data",
                arg1: "arg1data",
            }),
        )
        .add(
            Core.request.echo({
                arg1: "blah",
                arg2: "foo",
            }),
        );

    const postResponse = {
        sessionState,
        methodResponses: [
            [
                "Core/echo",
                {
                    arg2: "arg2data",
                    arg1: "arg1data",
                },
                "id_0",
            ],
            [
                "Core/echo",
                {
                    arg1: "blah",
                    arg2: "foo",
                },
                "id_1",
            ],
        ],
    };

    return { mockRequest, postResponse };
}
