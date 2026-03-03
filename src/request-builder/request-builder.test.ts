import type { Mocked } from "vitest";
import { assert } from "vitest";
import { Core } from "../capabilities/core/core.js";
import { Email } from "../capabilities/email/email.js";
import { Example } from "../capabilities/example/example.js";
import { CORE_CAPABILITY_URI, EMAIL_CAPABILITY_URI } from "../common/registry.js";
import type { InvocationList } from "../invocation-factory/invocation-list.js";
import type { BaseInvocationArgs } from "../invocation/types.js";
import { createMockClientContext } from "../jmap-client/test-utils.js";
import type { JMAPClientInterface } from "../jmap-client/types.js";
import { RequestBuilder } from "./request-builder.js";
import {
    createMockClient,
    createMockClientWithAccounts,
    createMockClientWithMaxCalls,
    createMockClientWithoutCapabilities,
} from "./test-utils.js";

describe("Request Builder class", () => {
    let mockClient: Mocked<JMAPClientInterface<RequestBuilder>>;
    const mockClientContext = createMockClientContext();

    beforeEach(() => {
        // Create a mock client with default settings (maxCallsInRequest: 4)
        vi.restoreAllMocks();
        mockClient = createMockClient();
    });

    it("should construct a new Request Builder", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        expect(builder).toBeInstanceOf(RequestBuilder);
    });

    it("should support adding a new method", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        const testMethod = Core.request.echo({ value: "test" });
        builder.add(testMethod);
        expect(builder.methodCalls).toContain(testMethod);
    });

    it("should support removing an Invocation", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        const testMethod = Core.request.echo({ value: "test" });
        builder.add(testMethod);
        builder.remove(testMethod);
        expect(builder.methodCalls).not.toContain(testMethod);
    });

    it("should handle removing a method that was never added", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        const testMethod = Core.request.echo({ value: "test" });
        builder.remove(testMethod);
        expect(builder.methodCalls.length).toBe(0);
    });

    it("should report the unique URIs for Invocations used", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder
            .add(Core.request.echo({ value: "test 1" }))
            .add(Email.request.get({ accountId: "test 3" }))
            .add(Core.request.echo({ value: "test 2" }));

        const using = builder.using;
        expect(using).toContain(CORE_CAPABILITY_URI);
        expect(using).toContain(EMAIL_CAPABILITY_URI);
        expect(using.size).toBe(2);
    });

    it("should support adding empty created IDs", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder.addCreatedIds({});
        expect(builder.createdIds).toEqual({});
    });

    it("should support adding multiple creation IDs to the map", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder.addCreatedIds({ "#a": "id1", "#b": "id2" });
        expect(builder.createdIds).toEqual({ "#a": "id1", "#b": "id2" });
    });

    it("should support adding multiple created IDs with multiple calls", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder.addCreatedIds({ "#a": "id1" });
        builder.addCreatedIds({ "#b": "id2" });
        expect(builder.createdIds).toEqual({ "#a": "id1", "#b": "id2" });
    });

    it("should support overwriting existing created IDs", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder.addCreatedIds({ "#a": "id1", "#b": "id2" });
        builder.addCreatedIds({ "#a": "id3" });
        expect(builder.createdIds).toEqual({ "#a": "id3", "#b": "id2" });
    });

    it("should support clearing created IDs", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder.addCreatedIds({ "#a": "id1" });
        builder.clearCreatedIds();
        expect(builder.createdIds).toEqual(null);
    });

    it("should support clearing created IDs when none have been added", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder.clearCreatedIds();
        expect(builder.createdIds).toEqual(null);
    });

    it("should build a valid JMAP request", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder
            .add(Core.request.echo({ value: "test 1" }))
            .add(Email.request.get({ accountId: "test 2" }))
            .add(Core.request.echo({ value: "test 3" }));
        builder.addCreatedIds({ "#a": "id1" });

        const request = builder.build();

        expect(request).toEqual({
            using: [CORE_CAPABILITY_URI, EMAIL_CAPABILITY_URI],
            methodCalls: [
                ["Core/echo", { value: "test 1" }, "id_0"],
                ["Email/get", { accountId: "test 2" }, "id_1"],
                ["Core/echo", { value: "test 3" }, "id_2"],
            ],
            createdIds: { "#a": "id1" },
        });
    });

    it("should build a valid JMAP request with no created IDs", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder
            .add(Core.request.echo({ value: "test 1" }))
            .add(Email.request.get({ accountId: "test 3" }))
            .add(Core.request.echo({ value: "test 2" }));

        const request = builder.build();

        expect(request).toEqual({
            using: [CORE_CAPABILITY_URI, EMAIL_CAPABILITY_URI],
            methodCalls: [
                ["Core/echo", { value: "test 1" }, "id_0"],
                ["Email/get", { accountId: "test 3" }, "id_1"],
                ["Core/echo", { value: "test 2" }, "id_2"],
            ],
        });
    });

    it("should build a valid JMAP request with an empty set of created IDs", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder
            .add(Core.request.echo({ value: "test 1" }))
            .add(Email.request.get({ accountId: "test 3" }))
            .add(Core.request.echo({ value: "test 2" }));
        builder.addCreatedIds({});

        const request = builder.build();

        expect(request).toEqual({
            using: [CORE_CAPABILITY_URI, EMAIL_CAPABILITY_URI],
            methodCalls: [
                ["Core/echo", { value: "test 1" }, "id_0"],
                ["Email/get", { accountId: "test 3" }, "id_1"],
                ["Core/echo", { value: "test 2" }, "id_2"],
            ],
            createdIds: {},
        });
    });

    it("should throw an error when an invocation has an invalid result reference", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);

        const test1 = Core.request.echo({ value: "test 1" });
        const test2 = Core.request.echo({ value: "test 2", ref: test1.createReference("/path") });

        builder.add(test2);

        expect(() => builder.build()).toThrowError();
    });

    it("should support serialising to JSON", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder
            .add(Core.request.echo({ value: "test 1" }))
            .add(Email.request.get({ accountId: "test 2" }))
            .add(Core.request.echo({ value: "test 3" }));
        builder.addCreatedIds({});

        const json = JSON.stringify(builder);

        expect(json).toEqual(
            JSON.stringify({
                using: [CORE_CAPABILITY_URI, EMAIL_CAPABILITY_URI],
                methodCalls: [
                    ["Core/echo", { value: "test 1" }, "id_0"],
                    ["Email/get", { accountId: "test 2" }, "id_1"],
                    ["Core/echo", { value: "test 3" }, "id_2"],
                ],
                createdIds: {},
            }),
        );
    });

    it("should return an empty idMap and reverseIdMap when no methods are added", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        expect(builder.idMap.size).toBe(0);
        expect(builder.reverseIdMap.size).toBe(0);
    });

    it("should return correct idMap after build", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        const inv1 = Core.request.echo({ value: "foo" });
        const inv2 = Core.request.echo({ value: "bar" });

        builder.add(inv1);
        builder.add(inv2);
        builder.build("test_");

        const idMap = builder.idMap;
        expect(idMap.size).toBe(2);
        expect(idMap.get(inv1.id)).toBeDefined();
        expect(idMap.get(inv2.id)).toBeDefined();
    });

    it("should return correct reverseIdMap after build", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        const inv1 = Core.request.echo({ value: "foo" });
        const inv2 = Core.request.echo({ value: "bar" });

        builder.add(inv1);
        builder.add(inv2);
        builder.build("test_");

        const idMap = builder.idMap;
        const id1 = idMap.get(inv1.id);
        const id2 = idMap.get(inv2.id);

        assert(id1 !== undefined && id2 !== undefined, "Both invocations should have IDs assigned");

        const reverseIdMap = builder.reverseIdMap;
        expect(reverseIdMap.size).toBe(2);
        expect(reverseIdMap.get(id1)).toBe(inv1.id);
        expect(reverseIdMap.get(id2)).toBe(inv2.id);
    });

    it("should keep idMap and reverseIdMap in sync after multiple builds", () => {
        const builder = new RequestBuilder(mockClient, mockClientContext);
        const inv1 = Core.request.echo({ value: "baz" });

        builder.add(inv1);
        builder.build("first_");
        const id1 = builder.idMap.get(inv1.id);

        builder.build("second_");
        const id2 = builder.idMap.get(inv1.id);

        assert(id1 !== undefined && id2 !== undefined, "Invocation should have IDs assigned");

        expect(typeof id2).toBe("string");
        expect(id1).not.toBe(id2);
        expect(builder.reverseIdMap.get(id2)).toBe(inv1.id);
    });

    it("should delegate send() to the client's sendAPIRequest method", async () => {
        const mockResponse: Awaited<ReturnType<JMAPClientInterface<RequestBuilder>["sendAPIRequest"]>> = {
            methodResponses: {} as InvocationList<BaseInvocationArgs>,
            sessionState: "test-state",
            createdIds: {},
        };
        const mockSendAPIRequest = mockClient.sendAPIRequest.mockResolvedValue(mockResponse);

        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder.add(Core.request.echo({ value: "test" }));

        const signal = new AbortController().signal;
        const result = await builder.send(signal);

        expect(mockSendAPIRequest).toHaveBeenCalledWith(builder, signal);
        expect(result).toBe(mockResponse);
    });

    it("should send with multiple method calls", async () => {
        const mockResponse: Awaited<ReturnType<JMAPClientInterface<RequestBuilder>["sendAPIRequest"]>> = {
            methodResponses: {} as InvocationList<BaseInvocationArgs>,
            sessionState: "test-state",
            createdIds: {},
        };
        const mockSendAPIRequest = mockClient.sendAPIRequest.mockResolvedValue(mockResponse);

        const builder = new RequestBuilder(mockClient, mockClientContext);
        builder.add(Core.request.echo({ value: "test 1" }));
        builder.add(Core.request.echo({ value: "test 2" }));

        const result = await builder.send();

        expect(mockSendAPIRequest).toHaveBeenCalledWith(builder, undefined);
        expect(result).toBe(mockResponse);
    });

    describe("maxCallsInRequest validation", () => {
        it("should enforce maxCallsInRequest limit when adding methods", () => {
            const builder = new RequestBuilder(mockClient, mockClientContext);

            // First two methods should be added successfully
            const method1 = Core.request.echo({ value: "test 1" });
            const method2 = Core.request.echo({ value: "test 2" });
            const method3 = Core.request.echo({ value: "test 3" });
            const method4 = Core.request.echo({ value: "test 4" });

            expect(() => builder.add(method1)).not.toThrow();
            expect(() => builder.add(method2)).not.toThrow();
            expect(() => builder.add(method3)).not.toThrow();
            expect(() => builder.add(method4)).not.toThrow();

            // Third method should throw an error
            const method5 = Core.request.echo({ value: "test 5" });
            expect(() => builder.add(method5)).toThrow(
                "Cannot add method: Request would exceed the server limit of 4 method calls.",
            );
        });

        it("should not check limit when no server capabilities are available", () => {
            // Use the createMockClientWithoutCapabilities utility
            const clientWithNoCapabilities = createMockClientWithoutCapabilities();

            const builder = new RequestBuilder(clientWithNoCapabilities, mockClientContext);

            // Should allow adding multiple methods without checking limits
            const methods = Array.from({ length: 10 }, (_, i) => Core.request.echo({ value: `test ${i}` }));

            for (const method of methods) {
                expect(() => builder.add(method)).not.toThrow();
            }

            expect(builder.methodCalls.length).toBe(10);
        });

        it("should allow adding same method multiple times without rechecking limit", () => {
            const builder = new RequestBuilder(mockClient, mockClientContext);
            const method = Core.request.echo({ value: "test" });

            // Adding the same method multiple times should work since Sets don't allow duplicates
            expect(() => builder.add(method)).not.toThrow();
            expect(() => builder.add(method)).not.toThrow(); // Should be no-op
            expect(() => builder.add(method)).not.toThrow(); // Should be no-op

            expect(builder.methodCalls.length).toBe(1);
        });

        it("should allow adding up to exactly the server limit", () => {
            const maxCallsInRequest = 16;
            // Create mockClient with a specific limit using the factory function
            const specificLimitClient = createMockClientWithMaxCalls(maxCallsInRequest);

            const builder = new RequestBuilder(specificLimitClient, mockClientContext);

            // Add the exact number of different methods (the limit)
            for (let i = 0; i < maxCallsInRequest; i++) {
                expect(() => builder.add(Core.request.echo({ value: `test limit ${i}` }))).not.toThrow();
            }

            expect(builder.methodCalls.length).toBe(maxCallsInRequest);

            // Attempting to add one more should throw
            expect(() => builder.add(Core.request.echo({ value: "one too many" }))).toThrow(
                `Cannot add method: Request would exceed the server limit of ${maxCallsInRequest} method calls.`,
            );
        });

        it("should reset checking when methods are removed", () => {
            const maxCallsInRequest = 3;
            // Create mockClient with a specific limit using the factory function
            const specificLimitClient = createMockClientWithMaxCalls(maxCallsInRequest);

            const builder = new RequestBuilder(specificLimitClient, mockClientContext);

            // Add 3 different methods (reaching the limit)
            const method1 = Core.request.echo({ value: "test 1" });
            const method2 = Core.request.echo({ value: "test 2" });
            const method3 = Core.request.echo({ value: "test 3" });

            expect(() => builder.add(method1)).not.toThrow();
            expect(() => builder.add(method2)).not.toThrow();
            expect(() => builder.add(method3)).not.toThrow();

            expect(builder.methodCalls.length).toBe(3);

            // Attempting to add one more should throw
            const extraMethod = Core.request.echo({ value: "extra" });
            expect(() => builder.add(extraMethod)).toThrow(
                "Cannot add method: Request would exceed the server limit of 3 method calls.",
            );

            // Remove a method and try adding the extra method again
            builder.remove(method1);
            expect(builder.methodCalls.length).toBe(2);

            // Now we should be able to add the extra method
            expect(() => builder.add(extraMethod)).not.toThrow();
            expect(builder.methodCalls.length).toBe(3);
        });

        it("should properly handle different capabilities from different clients", () => {
            // Test with one client with lower limit first
            const lowerLimit = 3;
            const clientWithLowerLimit = createMockClientWithMaxCalls(lowerLimit);

            const builder1 = new RequestBuilder(clientWithLowerLimit, mockClientContext);

            // Add 3 different methods (reaching the limit)
            for (let i = 0; i < lowerLimit; i++) {
                expect(() => builder1.add(Core.request.echo({ value: `test ${i}` }))).not.toThrow();
            }

            // Attempting to add one more should throw
            expect(() => builder1.add(Core.request.echo({ value: "one too many" }))).toThrow(
                "Cannot add method: Request would exceed the server limit of 3 method calls.",
            );

            // Now try with a client with higher limit
            const higherLimit = 10;
            const clientWithHigherLimit = createMockClientWithMaxCalls(higherLimit);
            const mockClientContextForHigherLimit = createMockClientContext();

            const builder2 = new RequestBuilder(clientWithHigherLimit, mockClientContextForHigherLimit);

            // Should allow adding more methods with higher limit
            for (let i = 0; i < 10; i++) {
                expect(() => builder2.add(Core.request.echo({ value: `test ${i}` }))).not.toThrow();
            }

            expect(builder2.methodCalls.length).toBe(10);
        });
    });

    describe("Validation failure paths", () => {
        it("should throw AggregateError when invocation validation fails", async () => {
            const clientWithAccounts = createMockClientWithAccounts();
            clientWithAccounts.capabilityRegistry.executeValidators = vi.fn().mockResolvedValue({
                valid: false,
                errors: [new Error("Invocation validation error")],
            });

            const builder = new RequestBuilder(clientWithAccounts, mockClientContext);
            builder.add(Core.request.echo({ value: "test" }));

            const error = await builder.serialize().catch((e: unknown) => e);
            expect(error).toBeInstanceOf(AggregateError);
            expect((error as AggregateError).message).toBe("Invocation validation failed");
        });

        it("should throw AggregateError when pre-build validation fails", async () => {
            const clientWithAccounts = createMockClientWithAccounts();
            // invocation validation succeeds, pre-build validation fails
            clientWithAccounts.capabilityRegistry.executeValidators = vi
                .fn()
                .mockResolvedValueOnce({ valid: true }) // invocation
                .mockResolvedValueOnce({ valid: false, errors: [new Error("Pre-build error")] }); // pre-build

            const builder = new RequestBuilder(clientWithAccounts, mockClientContext);
            builder.add(Core.request.echo({ value: "test" }));

            const error = await builder.serialize().catch((e: unknown) => e);
            expect(error).toBeInstanceOf(AggregateError);
            expect((error as AggregateError).message).toBe("Pre-build validation failed");
        });

        it("should throw AggregateError when pre-serialization validation fails", async () => {
            const clientWithAccounts = createMockClientWithAccounts();
            // invocation succeeds, pre-build succeeds, pre-serialization fails
            clientWithAccounts.capabilityRegistry.executeValidators = vi
                .fn()
                .mockResolvedValueOnce({ valid: true }) // invocation
                .mockResolvedValueOnce({ valid: true }) // pre-build
                .mockResolvedValueOnce({ valid: false, errors: [new Error("Pre-serialization error")] });
            // executeBuildTransformers needs to return valid data
            clientWithAccounts.capabilityRegistry.executeBuildTransformers = vi
                .fn()
                .mockImplementation((ctx: { context: { data: unknown } }) => ctx.context.data);

            const builder = new RequestBuilder(clientWithAccounts, mockClientContext);
            builder.add(Core.request.echo({ value: "test" }));

            const error = await builder.serialize().catch((e: unknown) => e);
            expect(error).toBeInstanceOf(AggregateError);
            expect((error as AggregateError).message).toBe("Pre-serialization validation failed");
        });

        it("should throw AggregateError when post-serialization validation fails", async () => {
            const clientWithAccounts = createMockClientWithAccounts();
            // invocation succeeds, pre-build succeeds, pre-serialization succeeds, post-serialization fails
            clientWithAccounts.capabilityRegistry.executeValidators = vi
                .fn()
                .mockResolvedValueOnce({ valid: true }) // invocation
                .mockResolvedValueOnce({ valid: true }) // pre-build
                .mockResolvedValueOnce({ valid: true }) // pre-serialization
                .mockResolvedValueOnce({ valid: false, errors: [new Error("Post-serialization error")] });
            clientWithAccounts.capabilityRegistry.executeBuildTransformers = vi
                .fn()
                .mockImplementation((ctx: { context: { data: unknown } }) => ctx.context.data);
            clientWithAccounts.capabilityRegistry.executeSerializationTransformers = vi
                .fn()
                .mockImplementation((ctx: { context: { data: unknown } }) => ctx.context.data);

            const builder = new RequestBuilder(clientWithAccounts, mockClientContext);
            builder.add(Core.request.echo({ value: "test" }));

            const error = await builder.serialize().catch((e: unknown) => e);
            expect(error).toBeInstanceOf(AggregateError);
            expect((error as AggregateError).message).toBe("Post-serialization validation failed");
        });
    });

    describe("Capability support", () => {
        it("should throw an error if the method's capability is not registered", () => {
            const mockClient = createMockClient();
            mockClient.capabilityRegistry.has = vi.fn().mockReturnValue(false);

            const builder = new RequestBuilder(mockClient, mockClientContext);
            const fakeInvocation = Example.request.echo({ value: "test" });
            expect(() => builder.add(fakeInvocation)).toThrow(/Unknown capability: urn:example/);
        });
    });
});
