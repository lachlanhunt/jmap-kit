import type { ReadableStreamReadResult } from "node:stream/web";
import { Core } from "../capabilities/core/core.js";
import { Example } from "../capabilities/example/example.js";
import { CORE_CAPABILITY_URI } from "../common/registry.js";
import mockSession from "../jmap-client/mock-session.json" with { type: "json" };
import type { PluginContext, TransformationPlugin, ValidationPlugin } from "./types.js";
import {
    hasRequiredCapabilityUri,
    shouldRunInvocationHook,
    shouldRunLifecycleHook,
    transformBuild,
    transformSerialization,
    validateInvocation,
    validateLifecycleHook,
    validateSerialization,
} from "./utils.js";

/**
 * Creates a gzip compression transformer for testing
 *
 * @param data The data to compress (can be string or Uint8Array)
 * @param options Options to customise the transformer
 * @returns A Promise resolving to a TransformationPlugin that applies gzip encoding
 */
const compressionTransformerPlugin: TransformationPlugin<"post-serialization"> = {
    name: "add-gzip-encoding",
    hook: "post-serialization",
    trigger: {
        requiredCapabilityUri: "https://www.fastmail.com/dev/compression",
    },
    transform: async (ctx: PluginContext<"post-serialization">) => {
        // Convert string to Uint8Array if needed
        let inputData: Uint8Array<ArrayBuffer>;
        const { body } = ctx.data; // string | Blob | ArrayBuffer | File
        if (typeof body === "string") {
            const encoder = new TextEncoder();
            inputData = encoder.encode(body);
        } else if (body instanceof Blob) {
            // handles File and Blob
            inputData = new Uint8Array(await body.arrayBuffer());
        } else {
            inputData = new Uint8Array(body);
        }

        // Set up compression pipeline
        const compressedChunks: Uint8Array<ArrayBuffer>[] = [];
        const cs = new CompressionStream("gzip");
        const writer = cs.writable.getWriter();
        const reader = cs.readable.getReader();

        // Write data to compression stream
        await writer.write(inputData);
        await writer.close();

        // Read compressed data
        let totalLength = 0;

        while (true) {
            const { done, value } = (await reader.read()) as ReadableStreamReadResult<Uint8Array<ArrayBuffer>>;
            if (done) break;
            compressedChunks.push(value);
            totalLength += value.length;
        }

        // Combine chunks into a single ArrayBuffer
        const compressedBuffer = new ArrayBuffer(totalLength);
        const compressedArray = new Uint8Array(compressedBuffer);
        let offset = 0;

        for (const chunk of compressedChunks) {
            compressedArray.set(chunk, offset);
            offset += chunk.length;
        }
        const headers = new Headers(ctx.data.headers);
        headers.append("Content-Encoding", "gzip");
        return {
            ...ctx.data,
            body: compressedBuffer,
            headers,
        };
    },
};

const serverCapabilities = mockSession.capabilities;
const accounts = mockSession.accounts;

const mockJMAPRequest = {
    using: [CORE_CAPABILITY_URI],
    methodCalls: [],
};

const exampleAccountId = Object.keys(accounts)[0] ?? "u0b5a3998";
const exampleGetInvocation = Example.request.get({ accountId: exampleAccountId }, Symbol("test"));
const exampleSetInvocation = Example.request.set({ accountId: exampleAccountId }, Symbol("test"));
const coreEchoInvocation = Core.request.echo({}, Symbol("test"));

describe("hasRequiredCapabilityUri", () => {
    it("returns true when requiredCapabilityUri is present and a string", () => {
        const trigger = { requiredCapabilityUri: CORE_CAPABILITY_URI };
        expect(hasRequiredCapabilityUri(trigger)).toBe(true);
    });

    it("returns false when requiredCapabilityUri is missing", () => {
        const trigger = {};
        expect(hasRequiredCapabilityUri(trigger)).toBe(false);
    });

    it("returns false when requiredCapabilityUri is not a string", () => {
        const trigger = { requiredCapabilityUri: 123 as unknown as string };
        expect(hasRequiredCapabilityUri(trigger)).toBe(false);
    });
});

// shouldRunInvocationHook checks if the trigger's dataType and method match the invocation's
describe("shouldRunInvocationHook", () => {
    it("returns true if all trigger properties match the invocation", () => {
        const trigger = {
            capabilityUri: CORE_CAPABILITY_URI,
            dataType: "Core",
            method: "echo",
        };
        const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
        expect(shouldRunInvocationHook(trigger, context)).toBe(true);
    });

    it("returns false if any trigger property does not match the invocation", () => {
        const trigger = {
            capabilityUri: "bar",
            dataType: "Example",
            method: "get",
        };
        const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
        expect(shouldRunInvocationHook(trigger, context)).toBe(false);
    });

    describe("omitted trigger properties (should match any value)", () => {
        // Empty trigger - matches any invocation
        it("returns true when trigger is empty (matches any invocation)", () => {
            const trigger = {};
            const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(true);
        });

        it("returns true when trigger is empty (matches different invocation)", () => {
            const trigger = {};
            const context = { invocation: exampleGetInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(true);
        });

        // Only capabilityUri specified
        it("returns true when only capabilityUri matches", () => {
            const trigger = { capabilityUri: CORE_CAPABILITY_URI };
            const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(true);
        });

        it("returns false when only capabilityUri doesn't match", () => {
            const trigger = { capabilityUri: "wrong-uri" };
            const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(false);
        });

        // Only dataType specified
        it("returns true when only dataType matches", () => {
            const trigger = { dataType: "Core" };
            const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(true);
        });

        it("returns false when only dataType doesn't match", () => {
            const trigger = { dataType: "WrongType" };
            const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(false);
        });

        // Only method specified
        it("returns true when only method matches", () => {
            const trigger = { method: "echo" };
            const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(true);
        });

        it("returns false when only method doesn't match", () => {
            const trigger = { method: "wrongMethod" };
            const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(false);
        });
    });

    describe("two-property combinations", () => {
        // capabilityUri + dataType
        it("returns true when capabilityUri and dataType match (method omitted)", () => {
            const trigger = { capabilityUri: "urn:example", dataType: "Example" };
            const context = { invocation: exampleGetInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(true);
        });

        it("returns false when capabilityUri matches but dataType doesn't (method omitted)", () => {
            const trigger = { capabilityUri: "urn:example", dataType: "WrongType" };
            const context = { invocation: exampleGetInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(false);
        });

        it("returns false when dataType matches but capabilityUri doesn't (method omitted)", () => {
            const trigger = { capabilityUri: "wrong-uri", dataType: "Example" };
            const context = { invocation: exampleGetInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(false);
        });

        // capabilityUri + method
        it("returns true when capabilityUri and method match (dataType omitted)", () => {
            const trigger = { capabilityUri: CORE_CAPABILITY_URI, method: "echo" };
            const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(true);
        });

        it("returns false when capabilityUri matches but method doesn't (dataType omitted)", () => {
            const trigger = { capabilityUri: CORE_CAPABILITY_URI, method: "wrongMethod" };
            const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(false);
        });

        it("returns false when method matches but capabilityUri doesn't (dataType omitted)", () => {
            const trigger = { capabilityUri: "wrong-uri", method: "echo" };
            const context = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(false);
        });

        // dataType + method
        it("returns true when dataType and method match (capabilityUri omitted)", () => {
            const trigger = { dataType: "Example", method: "get" };
            const context = { invocation: exampleGetInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(true);
        });

        it("returns false when dataType matches but method doesn't (capabilityUri omitted)", () => {
            const trigger = { dataType: "Example", method: "wrongMethod" };
            const context = { invocation: exampleGetInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(false);
        });

        it("returns false when method matches but dataType doesn't (capabilityUri omitted)", () => {
            const trigger = { dataType: "WrongType", method: "get" };
            const context = { invocation: exampleGetInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(false);
        });
    });

    describe("cross-invocation validation", () => {
        // Test that triggers work correctly with different invocations
        it("matches Example invocation with specific trigger", () => {
            const trigger = { capabilityUri: "urn:example", dataType: "Example", method: "get" };
            const context = { invocation: exampleGetInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(true);
        });

        it("doesn't match Core invocation with Example-specific trigger", () => {
            const trigger = { capabilityUri: "urn:example", dataType: "Example", method: "get" };
            const context = { invocation: exampleSetInvocation, serverCapabilities, accounts };
            expect(shouldRunInvocationHook(trigger, context)).toBe(false);
        });

        it("matches both invocations with generic dataType trigger", () => {
            const coreContext = { invocation: coreEchoInvocation, serverCapabilities, accounts };
            const exampleContext = { invocation: exampleGetInvocation, serverCapabilities, accounts };

            // Trigger that only specifies method but allows any dataType
            const echoTrigger = { method: "echo" };
            expect(shouldRunInvocationHook(echoTrigger, coreContext)).toBe(true);
            expect(shouldRunInvocationHook(echoTrigger, exampleContext)).toBe(false); // Example doesn't have echo method

            // Trigger that only specifies method for get
            const getTrigger = { method: "get" };
            expect(shouldRunInvocationHook(getTrigger, coreContext)).toBe(false); // Core doesn't have get method
            expect(shouldRunInvocationHook(getTrigger, exampleContext)).toBe(true);
        });
    });
});

describe("shouldRunLifecycleHook", () => {
    it("returns true if no requiredCapabilityUri", () => {
        const trigger = {};
        const context = { serverCapabilities, accounts, data: mockJMAPRequest };
        expect(shouldRunLifecycleHook(trigger, context)).toBe(true);
    });

    it("returns true if requiredCapabilityUri is present in serverCapabilities", () => {
        const trigger = { requiredCapabilityUri: CORE_CAPABILITY_URI };
        const context = { serverCapabilities, accounts, data: mockJMAPRequest };
        expect(shouldRunLifecycleHook(trigger, context)).toBe(true);
    });

    it("returns false if requiredCapabilityUri is not present in serverCapabilities", () => {
        const trigger = { requiredCapabilityUri: "bar" };
        const context = { serverCapabilities, accounts, data: mockJMAPRequest };
        expect(shouldRunLifecycleHook(trigger, context)).toBe(false);
    });
});

describe("validateLifecycleHook", () => {
    it("returns valid when all validators pass", async () => {
        const validator: ValidationPlugin<"pre-build"> = {
            name: "test",
            hook: "pre-build",
            trigger: {},
            validate: () => ({ valid: true }),
        };
        const context = { serverCapabilities, accounts, data: mockJMAPRequest };
        const result = await validateLifecycleHook("pre-build", context, [validator]);
        expect(result).toEqual({ valid: true });
    });

    it("returns errors when a validator fails", async () => {
        const validator: ValidationPlugin<"pre-build"> = {
            name: "fail",
            hook: "pre-build",
            trigger: {},
            validate: () => ({ valid: false, errors: [new Error("fail")] }),
        };
        const context = { serverCapabilities, accounts, data: mockJMAPRequest };
        const result = await validateLifecycleHook("pre-build", context, [validator]);
        expect(result.valid).toBe(false);
        expect(result.errors?.[0]?.message).toBe("fail");
    });

    it("catches thrown errors from validator", async () => {
        const validator: ValidationPlugin<"pre-build"> = {
            name: "throws",
            hook: "pre-build",
            trigger: {},
            validate: () => {
                throw new Error("boom");
            },
        };
        const context = { serverCapabilities, accounts, data: mockJMAPRequest };
        const result = await validateLifecycleHook("pre-build", context, [validator]);
        expect(result.valid).toBe(false);
        expect(result.errors?.[0]?.message).toMatch(/throws/);
    });
});

describe("validateSerialization", () => {
    const mockSerializationData = {
        body: "{}",
        headers: new Headers({
            "Content-Type": "application/json",
        }),
    };
    it("returns valid when all validators pass", async () => {
        const validator: ValidationPlugin<"post-serialization"> = {
            name: "test",
            hook: "post-serialization",
            trigger: {},
            validate: () => ({ valid: true }),
        };
        const context = {
            serverCapabilities,
            accounts,
            data: mockSerializationData,
        };
        const result = await validateSerialization(context, [validator]);
        expect(result).toEqual({ valid: true });
    });

    it("returns errors when a validator fails", async () => {
        const validator: ValidationPlugin<"post-serialization"> = {
            name: "fail",
            hook: "post-serialization",
            trigger: {},
            validate: () => ({ valid: false, errors: [new Error("fail")] }),
        };
        const context = {
            serverCapabilities,
            accounts,
            data: mockSerializationData,
        };
        const result = await validateSerialization(context, [validator]);
        expect(result.valid).toBe(false);
        expect(result.errors?.[0]?.message).toBe("fail");
    });

    it("catches thrown errors from validator", async () => {
        const validator: ValidationPlugin<"post-serialization"> = {
            name: "throws",
            hook: "post-serialization",
            trigger: {},
            validate: () => {
                throw new Error("boom");
            },
        };
        const context = {
            serverCapabilities,
            accounts,
            data: mockSerializationData,
        };
        const result = await validateSerialization(context, [validator]);
        expect(result.valid).toBe(false);
        expect(result.errors?.[0]?.message).toMatch(/throws/);
    });
});

describe("validateInvocation", () => {
    it("returns valid when all validators pass", async () => {
        const validator: ValidationPlugin<"invocation"> = {
            name: "test",
            hook: "invocation",
            trigger: {},
            validate: () => ({ valid: true }),
        };
        const context = {
            invocation: exampleGetInvocation,
            serverCapabilities,
            accounts,
        };
        const result = await validateInvocation(context, [validator]);
        expect(result).toEqual({ valid: true });
    });

    it("returns errors when a validator fails", async () => {
        const validator: ValidationPlugin<"invocation"> = {
            name: "fail",
            hook: "invocation",
            trigger: {},
            validate: () => ({ valid: false, errors: [new Error("fail")] }),
        };
        const context = {
            invocation: coreEchoInvocation,
            serverCapabilities,
            accounts,
        };
        const result = await validateInvocation(context, [validator]);
        expect(result.valid).toBe(false);
        expect(result.errors?.[0]?.message).toBe("fail");
    });

    it("catches thrown errors from validator", async () => {
        const validator: ValidationPlugin<"invocation"> = {
            name: "throws",
            hook: "invocation",
            trigger: {},
            validate: () => {
                throw new Error("boom");
            },
        };
        const context = {
            invocation: exampleGetInvocation,
            serverCapabilities,
            accounts,
        };
        const result = await validateInvocation(context, [validator]);
        expect(result.valid).toBe(false);
        expect(result.errors?.[0]?.message).toMatch(/throws/);
    });
});

describe("transformBuild", () => {
    it("returns original data when no transformers are provided", async () => {
        const requestData = { using: [CORE_CAPABILITY_URI], methodCalls: [] };
        const context = { serverCapabilities, accounts, data: requestData };

        const result = await transformBuild(context, []);

        expect(result).toBe(requestData);
    });

    it("runs a single transformer and returns its result", async () => {
        const requestData = { using: [CORE_CAPABILITY_URI], methodCalls: [] };
        const context = { serverCapabilities, accounts, data: requestData };

        const transformer: TransformationPlugin<"pre-serialization"> = {
            name: "test-transformer",
            hook: "pre-serialization",
            trigger: {},
            transform: (ctx) => {
                return {
                    using: [...ctx.data.using, "test-capability"],
                    methodCalls: ctx.data.methodCalls,
                };
            },
        };

        const result = await transformBuild(context, [transformer]);

        expect(result).toEqual({
            using: [CORE_CAPABILITY_URI, "test-capability"],
            methodCalls: [],
        });
    });

    it("runs multiple transformers in sequence", async () => {
        const requestData = { using: [CORE_CAPABILITY_URI], methodCalls: [] };
        const context = { serverCapabilities, accounts, data: requestData };

        const transformer1: TransformationPlugin<"pre-serialization"> = {
            name: "add-capability",
            hook: "pre-serialization",
            trigger: {},
            transform: (ctx) => {
                return {
                    using: [...ctx.data.using, "capability-1"],
                    methodCalls: ctx.data.methodCalls,
                };
            },
        };

        const transformer2: TransformationPlugin<"pre-serialization"> = {
            name: "add-method-call",
            hook: "pre-serialization",
            trigger: {},
            transform: (ctx) => {
                return {
                    using: ctx.data.using,
                    methodCalls: [...ctx.data.methodCalls, ["Core/echo", {}, "e0"]],
                };
            },
        };

        const result = await transformBuild(context, [transformer1, transformer2]);

        expect(result).toEqual({
            using: [CORE_CAPABILITY_URI, "capability-1"],
            methodCalls: [["Core/echo", {}, "e0"]],
        });
    });

    it("skips transformers whose trigger conditions aren't met", async () => {
        const requestData = { using: [CORE_CAPABILITY_URI], methodCalls: [] };
        const context = { serverCapabilities, accounts, data: requestData };

        const transformer1: TransformationPlugin<"pre-serialization"> = {
            name: "should-not-run",
            hook: "pre-serialization",
            trigger: { requiredCapabilityUri: "non-existent-capability" },
            transform: (ctx) => {
                return {
                    using: [...ctx.data.using, "should-not-be-added"],
                    methodCalls: ctx.data.methodCalls,
                };
            },
        };

        const transformer2: TransformationPlugin<"pre-serialization"> = {
            name: "should-run",
            hook: "pre-serialization",
            trigger: { requiredCapabilityUri: CORE_CAPABILITY_URI },
            transform: (ctx) => {
                return {
                    using: [...ctx.data.using, "should-be-added"],
                    methodCalls: ctx.data.methodCalls,
                };
            },
        };

        const result = await transformBuild(context, [transformer1, transformer2]);

        expect(result).toEqual({
            using: [CORE_CAPABILITY_URI, "should-be-added"],
            methodCalls: [],
        });
    });

    it("supports synchronous transformer implementations", async () => {
        const requestData = { using: [CORE_CAPABILITY_URI], methodCalls: [] };
        const context = { serverCapabilities, accounts, data: requestData };

        const transformer: TransformationPlugin<"pre-serialization"> = {
            name: "sync-transformer",
            hook: "pre-serialization",
            trigger: {},
            transform: (ctx) => {
                // This is a synchronous implementation that returns the data directly
                return {
                    using: [...ctx.data.using, "sync-capability"],
                    methodCalls: ctx.data.methodCalls,
                };
            },
        };

        const result = await transformBuild(context, [transformer]);

        expect(result).toEqual({
            using: [CORE_CAPABILITY_URI, "sync-capability"],
            methodCalls: [],
        });
    });

    it("supports async transformer implementations", async () => {
        const requestData = { using: [CORE_CAPABILITY_URI], methodCalls: [] };
        const context = { serverCapabilities, accounts, data: requestData };

        const transformer: TransformationPlugin<"pre-serialization"> = {
            name: "async-transformer",
            hook: "pre-serialization",
            trigger: {},
            transform: async (ctx) => {
                // Simulate async operation with a small delay
                await Promise.resolve();
                return {
                    using: [...ctx.data.using, "async-capability"],
                    methodCalls: ctx.data.methodCalls,
                };
            },
        };

        const result = await transformBuild(context, [transformer]);

        expect(result).toEqual({
            using: [CORE_CAPABILITY_URI, "async-capability"],
            methodCalls: [],
        });
    });

    it("runs mixed sync and async transformers in sequence", async () => {
        const requestData = { using: [CORE_CAPABILITY_URI], methodCalls: [] };
        const context = { serverCapabilities, accounts, data: requestData };

        const syncTransformer: TransformationPlugin<"pre-serialization"> = {
            name: "sync-transformer",
            hook: "pre-serialization",
            trigger: {},
            transform: (ctx) => {
                return {
                    using: [...ctx.data.using, "sync-capability"],
                    methodCalls: ctx.data.methodCalls,
                };
            },
        };

        const asyncTransformer: TransformationPlugin<"pre-serialization"> = {
            name: "async-transformer",
            hook: "pre-serialization",
            trigger: {},
            transform: async (ctx) => {
                // Simulate async operation with a small delay
                await new Promise((resolve) => setTimeout(resolve, 10));
                return {
                    using: [...ctx.data.using, "async-capability"],
                    methodCalls: ctx.data.methodCalls,
                };
            },
        };

        const result = await transformBuild(context, [syncTransformer, asyncTransformer]);

        expect(result).toEqual({
            using: [CORE_CAPABILITY_URI, "sync-capability", "async-capability"],
            methodCalls: [],
        });
    });
});

describe("transformSerialization", () => {
    it("returns original data when no transformers are provided", async () => {
        const serializationData = {
            body: JSON.stringify({ using: [CORE_CAPABILITY_URI], methodCalls: [] }),
            headers: new Headers({
                "Content-Type": "application/json",
            }),
        };
        const context = { serverCapabilities, accounts, data: serializationData };

        const result = await transformSerialization(context, []);

        expect(result).toBe(serializationData);
    });

    it("runs a transformer and returns its result", async () => {
        const serializationData = {
            body: JSON.stringify({ using: [CORE_CAPABILITY_URI], methodCalls: [] }),
            headers: new Headers({
                "Content-Type": "application/json",
            }),
        };
        const context = {
            serverCapabilities: {
                ...serverCapabilities,
                "https://www.fastmail.com/dev/compression": {},
            },
            accounts,
            data: serializationData,
        };

        const result = await transformSerialization(context, [compressionTransformerPlugin]);

        // Verify the result
        expect(result).toEqual({
            body: expect.any(ArrayBuffer),
            headers: expect.toHaveHeaders({
                "Content-Type": "application/json",
                "Content-Encoding": "gzip",
            }),
        });
    });

    it("runs multiple transformers in sequence", async () => {
        const serializationData = {
            body: JSON.stringify({ using: [CORE_CAPABILITY_URI], methodCalls: [] }),
            headers: new Headers({
                "Content-Type": "application/json",
            }),
        };
        const context = {
            serverCapabilities: {
                ...serverCapabilities,
                "https://www.fastmail.com/dev/compression": {},
            },
            accounts,
            data: serializationData,
        };

        const transformer1: TransformationPlugin<"post-serialization"> = {
            name: "change-content-type",
            hook: "post-serialization",
            trigger: {},
            transform: ({ data }) => {
                data.headers.set("Content-Type", "application/example+json");

                return data;
            },
        };

        const result = await transformSerialization(context, [transformer1, compressionTransformerPlugin]);

        expect(result).toEqual({
            body: expect.any(ArrayBuffer),
            headers: expect.toHaveHeaders({
                "Content-Type": "application/example+json",
                "Content-Encoding": "gzip",
            }),
        });
    });

    it("supports different body types", async () => {
        // Test with string body that gets converted to Blob
        const stringBody = JSON.stringify({ using: [CORE_CAPABILITY_URI], methodCalls: [] });
        const serializationData = {
            body: stringBody,
            headers: new Headers({
                "Content-Type": "application/json",
            }),
        };
        const context = { serverCapabilities, accounts, data: serializationData };

        const transformer: TransformationPlugin<"post-serialization"> = {
            name: "use-blob",
            hook: "post-serialization",
            trigger: {},
            transform: (ctx) => {
                // Convert string to Blob
                const blob = new Blob([ctx.data.body as string], { type: "application/json" });
                return {
                    ...ctx.data,
                    body: blob,
                };
            },
        };

        const result = await transformSerialization(context, [transformer]);

        expect(result.body).toBeInstanceOf(Blob);
        expect(result.headers).toHaveHeaders({
            "Content-Type": "application/json",
        });
    });

    it("skips transformers whose trigger conditions aren't met", async () => {
        const serializationData = {
            body: JSON.stringify({ using: [CORE_CAPABILITY_URI], methodCalls: [] }),
            headers: new Headers({
                "Content-Type": "application/json",
            }),
        };
        const context = { serverCapabilities, accounts, data: serializationData };

        const transformer1: TransformationPlugin<"post-serialization"> = {
            name: "should-not-run",
            hook: "post-serialization",
            trigger: { requiredCapabilityUri: "non-existent-capability" },
            transform: ({ data }) => {
                data.headers.set("Content-Encoding", "gzip");
                return data;
            },
        };

        const transformer2: TransformationPlugin<"post-serialization"> = {
            name: "should-run",
            hook: "post-serialization",
            trigger: { requiredCapabilityUri: CORE_CAPABILITY_URI },
            transform: ({ data }) => {
                data.headers.set("Content-Type", "application/example+json");

                return data;
            },
        };

        const result = await transformSerialization(context, [transformer1, transformer2]);

        expect(result.headers).toHaveHeaders({
            "Content-Type": "application/example+json",
        });

        expect(result.headers).not.toHaveHeaders({
            "Content-Encoding": "gzip",
        });
    });

    it("supports synchronous transformer implementations", async () => {
        const serializationData = {
            body: JSON.stringify({ using: [CORE_CAPABILITY_URI], methodCalls: [] }),
            headers: new Headers({
                "Content-Type": "application/json",
            }),
        };
        const context = { serverCapabilities, accounts, data: serializationData };

        const transformer: TransformationPlugin<"post-serialization"> = {
            name: "sync-transformer",
            hook: "post-serialization",
            trigger: {},
            transform: ({ data }) => {
                data.headers.set("Content-Type", "application/sync+json");
                return data;
            },
        };

        const result = await transformSerialization(context, [transformer]);

        expect(result.headers).toHaveHeaders({
            "Content-Type": "application/sync+json",
        });
    });

    it("supports async transformer implementations", async () => {
        const serializationData = {
            body: JSON.stringify({ using: [CORE_CAPABILITY_URI], methodCalls: [] }),
            headers: new Headers({
                "Content-Type": "application/json",
            }),
        };
        const context = { serverCapabilities, accounts, data: serializationData };

        const transformer: TransformationPlugin<"post-serialization"> = {
            name: "async-transformer",
            hook: "post-serialization",
            trigger: {},
            transform: async ({ data }) => {
                // Simulate async operation with a small delay
                await new Promise((resolve) => setTimeout(resolve, 10));
                data.headers.set("Content-Type", "application/async+json");
                return data;
            },
        };

        const result = await transformSerialization(context, [transformer]);

        expect(result.headers).toHaveHeaders({
            "Content-Type": "application/async+json",
        });
    });

    it("runs mixed sync and async transformers in sequence", async () => {
        const serializationData = {
            body: JSON.stringify({ using: [CORE_CAPABILITY_URI], methodCalls: [] }),
            headers: new Headers({
                "Content-Type": "application/json",
            }),
        };
        const context = { serverCapabilities, accounts, data: serializationData };

        const syncTransformer: TransformationPlugin<"post-serialization"> = {
            name: "sync-transformer",
            hook: "post-serialization",
            trigger: {},
            transform: ({ data }) => {
                data.headers.set("Content-Type", "application/sync+json");
                return data;
            },
        };

        const asyncTransformer: TransformationPlugin<"post-serialization"> = {
            name: "async-transformer",
            hook: "post-serialization",
            trigger: {},
            transform: async ({ data }) => {
                // Simulate async operation with a small delay
                await new Promise((resolve) => setTimeout(resolve, 10));
                data.headers.append("Content-Encoding", "test-encoding");
                return data;
            },
        };

        const result = await transformSerialization(context, [syncTransformer, asyncTransformer]);

        expect(result.headers).toHaveHeaders({
            "Content-Type": "application/sync+json",
            "Content-Encoding": "test-encoding",
        });
    });
});
