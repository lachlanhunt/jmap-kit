import type { Mocked } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Example } from "../capabilities/example/example.js";
import { CORE_CAPABILITY_URI, EMAIL_CAPABILITY_URI } from "../common/registry.js";
import type { JMAPCapability } from "../common/types.js";
import mockSession from "../jmap-client/mock-session.json" with { type: "json" };
import { createMockClientContext } from "../jmap-client/test-utils.js";
import { CapabilityRegistry } from "./capability-registry.js";
import {
    asyncTransformer,
    conditionalTransformer,
    coreCapability,
    createMockCapability,
    CUSTOM_CAPABILITY_URI,
    invocationValidator,
    mailCapability,
    modifyingTransformer,
    postSerializationErrorTransformer,
    postSerializationValidator,
    preBuildValidator,
    preSerializationErrorTransformer,
    preSerializationTransformer,
    preSerializationValidator,
} from "./test-utils.js";
import type { CapabilityDefinition, TransformationPlugin } from "./types.js";
import { mergeHeaders } from "../jmap-client/utils/merge-headers.js";

describe("CapabilityRegistry", () => {
    let registry: CapabilityRegistry;
    const mockClientContext = createMockClientContext();

    beforeEach(() => {
        vi.clearAllMocks();
        registry = new CapabilityRegistry(coreCapability, mockClientContext);
    });

    describe("constructor", () => {
        it("registers the Core capability", () => {
            expect(registry.has(CORE_CAPABILITY_URI)).toBe(true);
            expect(registry.get(CORE_CAPABILITY_URI)).toBe(coreCapability);
        });

        it("throws error if a non-Core capability is provided", () => {
            expect(() => new CapabilityRegistry(mailCapability, mockClientContext)).toThrow(
                /Core capability URI mismatch/,
            );
        });
    });

    describe("register", () => {
        it("registers a new capability", () => {
            expect(registry.register(mailCapability)).toBe(true);
            expect(registry.has(EMAIL_CAPABILITY_URI)).toBe(true);
        });

        it("returns false when registering an already registered capability", () => {
            expect(registry.register(coreCapability)).toBe(false); // Core is already registered

            registry.register(mailCapability);
            expect(registry.register(mailCapability)).toBe(false);
        });
    });

    describe("has", () => {
        it("returns true for registered capabilities", () => {
            // Core is already registered from constructor
            expect(registry.has(CORE_CAPABILITY_URI)).toBe(true);

            registry.register(mailCapability);
            expect(registry.has(EMAIL_CAPABILITY_URI)).toBe(true);
        });

        it("returns false for unregistered capabilities", () => {
            expect(registry.has(CUSTOM_CAPABILITY_URI)).toBe(false);
        });
    });

    describe("get", () => {
        it("returns the capability definition for a registered capability", () => {
            // Core is already registered from constructor
            expect(registry.get(CORE_CAPABILITY_URI)).toBe(coreCapability);

            registry.register(mailCapability);
            expect(registry.get(EMAIL_CAPABILITY_URI)).toBe(mailCapability);
        });

        it("returns undefined for an unregistered capability", () => {
            expect(registry.get(CUSTOM_CAPABILITY_URI)).toBeUndefined();
        });
    });

    describe("getAll", () => {
        it("returns all registered capabilities", () => {
            // Core is already registered from constructor
            registry.register(mailCapability);

            const capabilities = registry.getAll();
            expect(capabilities).toHaveLength(2);
            expect(capabilities).toContain(coreCapability);
            expect(capabilities).toContain(mailCapability);
        });

        it("returns at least the Core capability even when no others are registered", () => {
            const capabilities = registry.getAll();
            expect(capabilities).toHaveLength(1);
            expect(capabilities).toContain(coreCapability);
        });
    });

    describe("getValidatorsByHook", () => {
        beforeEach(() => {
            // Core is already registered from constructor
            registry.register(mailCapability);
        });

        it("returns validators for the pre-build hook", () => {
            const validators = registry.getValidatorsByHook("pre-build");
            expect(validators).toHaveLength(1);
            expect(validators[0]).toBe(preBuildValidator);
        });

        it("returns validators for the pre-serialization hook", () => {
            const validators = registry.getValidatorsByHook("pre-serialization");
            expect(validators).toHaveLength(1);
            expect(validators[0]).toBe(preSerializationValidator);
        });

        it("returns validators for the invocation hook", () => {
            const validators = registry.getValidatorsByHook("invocation");
            expect(validators).toHaveLength(1);
            expect(validators[0]).toBe(invocationValidator);
        });

        it("returns an empty array when no validators exist for a hook", () => {
            const validators = registry.getValidatorsByHook("post-serialization");
            expect(validators).toEqual([]);
        });

        it("handles capabilities with undefined validators gracefully", () => {
            // Register a capability without any validators defined
            const capabilityWithoutValidators: CapabilityDefinition = {
                uri: "capability-without-validators" as JMAPCapability,
                invocations: {},
                // No validators defined
            };

            registry.register(capabilityWithoutValidators);

            // Should still return validators from other capabilities
            const validators = registry.getValidatorsByHook("pre-build");
            expect(validators).toHaveLength(1);
            expect(validators[0]).toBe(preBuildValidator);
        });
    });

    describe("getTransformersByHook", () => {
        beforeEach(() => {
            // Core is already registered from constructor
            registry.register(mailCapability);
        });

        it("returns transformers for the pre-serialization hook", () => {
            const transformers = registry.getTransformersByHook("pre-serialization");
            expect(transformers).toHaveLength(1);
            expect(transformers[0]).toBe(preSerializationTransformer);
        });

        it("handles capabilities with undefined transformers gracefully", () => {
            // Register a capability without any transformers defined
            const capabilityWithoutTransformers: CapabilityDefinition = {
                uri: "capability-without-transformers" as JMAPCapability,
                invocations: {},
                // No transformers defined
            };

            registry.register(capabilityWithoutTransformers);

            // Should still return transformers from other capabilities
            const transformers = registry.getTransformersByHook("pre-serialization");
            expect(transformers).toHaveLength(1);
            expect(transformers[0]).toBe(preSerializationTransformer);
        });
    });

    describe("executeValidators", () => {
        let registry: CapabilityRegistry;
        const coreCapability = createMockCapability({
            validators: [preBuildValidator, invocationValidator, preSerializationValidator, postSerializationValidator],
        });

        const serverCapabilities = mockSession.capabilities;
        const accounts = mockSession.accounts;

        beforeEach(() => {
            vi.clearAllMocks();
            registry = new CapabilityRegistry(coreCapability, mockClientContext);
        });

        it("validates using pre-build hook and calls validator", async () => {
            const result = await registry.executeValidators({
                hook: "pre-build",
                context: {
                    serverCapabilities,
                    accounts,
                    data: { using: [CORE_CAPABILITY_URI], methodCalls: [] },
                },
            });
            expect(result.valid).toBe(true);
            expect(preBuildValidator.validate).toHaveBeenCalled();
        });

        it("validates using pre-serialization hook and calls validator", async () => {
            const result = await registry.executeValidators({
                hook: "pre-serialization",
                context: {
                    serverCapabilities,
                    accounts,
                    data: { using: [CORE_CAPABILITY_URI], methodCalls: [] },
                },
            });
            expect(result.valid).toBe(true);
            expect(preSerializationValidator.validate).toHaveBeenCalled();
        });
        it("validates using invocation hook and calls validator", async () => {
            const exampleAccountId: keyof typeof accounts = Object.keys(accounts)[0] as keyof typeof accounts;
            const invocation = Example.request.get({ accountId: exampleAccountId }, Symbol("test"));
            const result = await registry.executeValidators({
                hook: "invocation",
                context: {
                    invocation,
                    serverCapabilities,
                    accounts,
                },
            });
            expect(result.valid).toBe(true);
            expect(invocationValidator.validate).toHaveBeenCalled();
        });
        it("validates using post-serialization hook and calls validator", async () => {
            const result = await registry.executeValidators({
                hook: "post-serialization",
                context: {
                    serverCapabilities,
                    accounts,
                    data: {
                        body: "{}",
                        headers: new Headers({
                            "Content-Type": "application/json",
                        }),
                    },
                },
            });
            expect(result.valid).toBe(true);
            expect(postSerializationValidator.validate).toHaveBeenCalled();
        });
        it("returns errors when a validator returns invalid result", async () => {
            preBuildValidator.validate.mockImplementationOnce((_ctx: unknown) => ({
                valid: false,
                errors: [new Error("fail")],
            }));
            const result = await registry.executeValidators({
                hook: "pre-build",
                context: {
                    serverCapabilities,
                    accounts,
                    data: { using: [CORE_CAPABILITY_URI], methodCalls: [] },
                },
            });
            expect(result.valid).toBe(false);
            expect(result.errors?.[0]?.message).toBe("fail");
        });
    });

    describe("executeBuildTransformers", () => {
        let registry: CapabilityRegistry;
        const serverCapabilities = mockSession.capabilities;
        const accounts = mockSession.accounts;

        beforeEach(() => {
            vi.clearAllMocks();
            // Only include errorTransformer for the error-handling test
            registry = new CapabilityRegistry(
                createMockCapability({
                    transformers: [modifyingTransformer, conditionalTransformer, asyncTransformer],
                }),
                mockClientContext,
            );
        });

        it("modifies data through transformers", async () => {
            const context = {
                serverCapabilities,
                accounts,
                data: {
                    using: [CORE_CAPABILITY_URI],
                    methodCalls: [],
                },
            };

            const result = await registry.executeBuildTransformers({
                hook: "pre-serialization",
                context,
            });

            expect(result.using).toContain("added-capability");
            expect(modifyingTransformer.transform).toHaveBeenCalledWith(context);
        });

        it("skips transformers whose trigger conditions aren't met", async () => {
            const context = {
                serverCapabilities,
                accounts,
                data: {
                    using: [CORE_CAPABILITY_URI],
                    methodCalls: [],
                },
            };

            const result = await registry.executeBuildTransformers({
                hook: "pre-serialization",
                context,
            });

            expect(result.using).not.toContain("should-not-be-added");
            expect(conditionalTransformer.transform).not.toHaveBeenCalled();
        });

        it("handles async transformers properly", async () => {
            const context = {
                serverCapabilities,
                accounts,
                data: {
                    using: [CORE_CAPABILITY_URI],
                    methodCalls: [],
                },
            };

            const result = await registry.executeBuildTransformers({
                hook: "pre-serialization",
                context,
            });

            expect(result.methodCalls).toContainEqual(["Core/echo", {}, "async-id"]);
            expect(asyncTransformer.transform).toHaveBeenCalledWith(expect.any(Object));
        });

        it("applies transformers in sequence with cumulative changes", async () => {
            // Create specialised registry for this test with transformers in a specific order
            const sequentialTransformer1: Mocked<TransformationPlugin<"pre-serialization">> = {
                name: "sequential-1",
                hook: "pre-serialization",
                trigger: {},
                transform: vi.fn<TransformationPlugin<"pre-serialization">["transform"]>((ctx) => ({
                    using: [...ctx.data.using, "capability-1"],
                    methodCalls: ctx.data.methodCalls,
                })),
            };

            const sequentialTransformer2: Mocked<TransformationPlugin<"pre-serialization">> = {
                name: "sequential-2",
                hook: "pre-serialization",
                trigger: {},
                transform: vi.fn<TransformationPlugin<"pre-serialization">["transform"]>((ctx) => ({
                    using: [...ctx.data.using, "capability-2"],
                    methodCalls: [...ctx.data.methodCalls, ["Core/echo", {}, "seq-id"]],
                })),
            };
            const sequentialRegistry = new CapabilityRegistry(
                createMockCapability({
                    transformers: [sequentialTransformer1, sequentialTransformer2],
                }),
                mockClientContext,
            );

            const context = {
                serverCapabilities,
                accounts,
                data: {
                    using: [CORE_CAPABILITY_URI],
                    methodCalls: [],
                },
            };

            const result = await sequentialRegistry.executeBuildTransformers({
                hook: "pre-serialization",
                context,
            });

            expect(result.using).toEqual([CORE_CAPABILITY_URI, "capability-1", "capability-2"]);
            expect(result.methodCalls).toEqual([["Core/echo", {}, "seq-id"]]);
            expect(sequentialTransformer1.transform).toHaveBeenCalledWith(context);
            // The second transformer should receive context with data from the first transformer
            expect(sequentialTransformer2.transform).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        using: [CORE_CAPABILITY_URI, "capability-1"],
                    }),
                }),
            );
        });

        it("handles errors in transformers gracefully", async () => {
            const context = {
                serverCapabilities,
                accounts,
                data: {
                    using: [CORE_CAPABILITY_URI],
                    methodCalls: [],
                },
            };

            // For this test, include errorTransformer
            registry = new CapabilityRegistry(
                createMockCapability({
                    transformers: [preSerializationErrorTransformer],
                }),
                mockClientContext,
            );

            await expect(
                registry.executeBuildTransformers({
                    hook: "pre-serialization",
                    context,
                }),
            ).rejects.toThrow("Transformer error");

            expect(preSerializationErrorTransformer.transform).toHaveBeenCalled();
        });

        it("returns original data when no transformers are registered for the hook", async () => {
            // Use createMockCapability for a different hook
            const differentHookRegistry = new CapabilityRegistry(
                createMockCapability({
                    transformers: [postSerializationErrorTransformer], // Throws an error if incorrectly applied
                }),
                mockClientContext,
            );

            const context = {
                serverCapabilities,
                accounts,
                data: {
                    using: [CORE_CAPABILITY_URI],
                    methodCalls: [],
                },
            };

            const result = await differentHookRegistry.executeBuildTransformers({
                hook: "pre-serialization",
                context,
            });

            expect(result).toBe(context.data);
        });
    });

    describe("executeSerializationTransformers", () => {
        let registry: CapabilityRegistry;
        const coreCapability: CapabilityDefinition = {
            uri: CORE_CAPABILITY_URI,
            invocations: {},
            validators: [],
            transformers: [preSerializationTransformer],
        };
        beforeEach(() => {
            vi.clearAllMocks();
            registry = new CapabilityRegistry(coreCapability, mockClientContext);
        });

        it("returns the original data when no transformers are defined for the hook", async () => {
            const context = {
                serverCapabilities: mockSession.capabilities,
                accounts: mockSession.accounts,
                data: {
                    body: "{}",
                    headers: new Headers({
                        "Content-Type": "application/json",
                    }),
                },
            };
            const result = await registry.executeSerializationTransformers({
                context,
            });
            expect(result).toBe(context.data);
        });

        it("applies transformers in sequence with cumulative changes", async () => {
            const transformer1: Mocked<TransformationPlugin<"post-serialization">> = {
                name: "transformer-1",
                hook: "post-serialization",
                trigger: {},
                transform: vi.fn((ctx) => {
                    const headers = new Headers(ctx.data.headers);
                    headers.set("Content-Type", "application/custom-type");
                    return {
                        ...ctx.data,
                        headers,
                    };
                }),
            };
            const transformer2: Mocked<TransformationPlugin<"post-serialization">> = {
                name: "transformer-2",
                hook: "post-serialization",
                trigger: {},
                transform: vi.fn((ctx) => {
                    const headers = mergeHeaders(ctx.data.headers, [["Content-Encoding", "gzip"]]);
                    return {
                        ...ctx.data,
                        headers,
                    };
                }),
            };
            const registrySeq = new CapabilityRegistry(
                createMockCapability({ transformers: [transformer1, transformer2] }),
                mockClientContext,
            );
            const context = {
                serverCapabilities: mockSession.capabilities,
                accounts: mockSession.accounts,
                data: {
                    body: "{}",
                    headers: new Headers({
                        "Content-Type": "application/json",
                    }),
                },
            };
            const result = await registrySeq.executeSerializationTransformers({
                context,
            });
            expect(result.headers).toHaveHeaders({
                "Content-Type": "application/custom-type",
                "Content-Encoding": "gzip",
            });
            expect(transformer1.transform).toHaveBeenCalledWith({
                ...context,
            });
            expect(transformer2.transform).toHaveBeenCalledWith({
                ...context,
                data: expect.objectContaining({
                    headers: expect.toHaveHeaders({
                        "Content-Type": "application/custom-type",
                    }),
                }),
            });
        });

        it("handles errors in transformers gracefully", async () => {
            const registryErr = new CapabilityRegistry(
                createMockCapability({ transformers: [postSerializationErrorTransformer] }),
                mockClientContext,
            );
            const context = {
                serverCapabilities: mockSession.capabilities,
                accounts: mockSession.accounts,
                data: {
                    body: "{}",
                    headers: new Headers({
                        "Content-Type": "application/json",
                    }),
                },
            };
            await expect(registryErr.executeSerializationTransformers({ context })).rejects.toThrow(
                "Transformer error",
            );
            expect(postSerializationErrorTransformer.transform).toHaveBeenCalled();
        });
    });
});
