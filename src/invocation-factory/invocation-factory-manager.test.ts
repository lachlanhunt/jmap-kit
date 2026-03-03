import { vi } from "vitest";
import { Core, CoreInvocation } from "../capabilities/core/core.js";
import { Mailbox, MailboxInvocation } from "../capabilities/mailbox/mailbox.js";
import type { JMAPResponseInvocation } from "../common/types.js";
import { ErrorInvocation } from "../invocation/error-invocation.js";
import { createMockClientContext } from "../jmap-client/test-utils.js";
import { createMockClient } from "../request-builder/test-utils.js";
import { InvocationFactoryManager } from "./invocation-factory-manager.js";

describe("Invocation Factory", () => {
    const reverseIdMap = new Map([
        ["c1", Symbol()],
        ["c2", Symbol()],
    ]);

    it("should construct invocations", () => {
        const mockClient = createMockClient();
        const mockClientContext = createMockClientContext();
        //         ^?
        // Mock the capability registry to return Core response factory
        vi.mocked(mockClient.capabilityRegistry).getInvocationResponseFactory.mockImplementation(
            (dataType, methodName) => {
                if (dataType === "Core" && methodName === "echo") {
                    return Core.response.echo;
                }
                return undefined;
            },
        );

        const manager = new InvocationFactoryManager(mockClient, mockClientContext);

        const methodResponses: JMAPResponseInvocation[] = [
            ["Core/echo", { arg2: "arg2data", arg1: "arg1data" }, "c1"],
            ["Core/echo", { arg1: "blah", arg2: "foo" }, "c2"],
        ];

        const responseList = manager.createInvocations(methodResponses, reverseIdMap);
        const responses = Array.from(responseList);
        expect(responses[0]).toBeInstanceOf(CoreInvocation);
        expect(responses[0]?.name).toBe("Core/echo");
        expect(responses[1]).toBeInstanceOf(CoreInvocation);
    });

    it("should throw an error if no invocation factory is provided for the data type", () => {
        const mockClient = createMockClient();
        const mockClientContext = createMockClientContext();

        // Mock to return undefined for Mailbox methods
        vi.mocked(mockClient.capabilityRegistry).getInvocationResponseFactory.mockReturnValue(undefined);

        const manager = new InvocationFactoryManager(mockClient, mockClientContext);

        const methodResponses: JMAPResponseInvocation[] = [["Mailbox/get", { arg1: "blah", arg2: "foo" }, "c1"]];

        expect(() => manager.createInvocations(methodResponses, reverseIdMap)).toThrow(
            "No response factory function available for Mailbox/get",
        );
    });

    it("should throw an error if no invocation factory is provided for the the method", () => {
        const mockClient = createMockClient();
        const mockClientContext = createMockClientContext();

        // Mock to return undefined for unknown Core methods
        vi.mocked(mockClient.capabilityRegistry).getInvocationResponseFactory.mockReturnValue(undefined);

        const manager = new InvocationFactoryManager(mockClient, mockClientContext);

        const methodResponses: JMAPResponseInvocation[] = [["Core/unknown", { arg1: "blah", arg2: "foo" }, "c1"]];

        expect(() => manager.createInvocations(methodResponses, reverseIdMap)).toThrow(
            "No response factory function available for Core/unknown",
        );
    });

    it("should construct invocations from multiple data types when available in capability registry", () => {
        const mockClient = createMockClient();
        const mockClientContext = createMockClientContext();

        // Mock the capability registry to return factories for both Core and Mailbox
        vi.mocked(mockClient.capabilityRegistry).getInvocationResponseFactory.mockImplementation(
            (dataType, methodName) => {
                if (dataType === "Core" && methodName === "echo") {
                    return Core.response.echo;
                }
                if (dataType === "Mailbox" && methodName === "get") {
                    return Mailbox.response.get;
                }
                return undefined;
            },
        );

        const manager = new InvocationFactoryManager(mockClient, mockClientContext);

        const methodResponses: JMAPResponseInvocation[] = [
            ["Core/echo", { arg2: "arg2data", arg1: "arg1data" }, "c1"],
            ["Mailbox/get", { arg1: "blah", arg2: "foo" }, "c2"],
        ];

        const responseList = manager.createInvocations(methodResponses, reverseIdMap);
        const responses = Array.from(responseList);

        expect(responses[0]).toBeInstanceOf(CoreInvocation);
        expect(responses[0]?.name).toBe("Core/echo");
        expect(responses[1]).toBeInstanceOf(MailboxInvocation);
        expect(responses[1]?.name).toBe("Mailbox/get");
    });

    it("should log a warning if reverseIdMap does not contain the methodCallId", () => {
        const mockClient = createMockClient();
        const mockClientContext = createMockClientContext();

        // Mock the capability registry to return Mailbox response factory
        vi.mocked(mockClient.capabilityRegistry).getInvocationResponseFactory.mockImplementation(
            (dataType, methodName) => {
                if (dataType === "Mailbox" && methodName === "get") {
                    return Mailbox.response.get;
                }
                return undefined;
            },
        );

        const manager = new InvocationFactoryManager(mockClient, mockClientContext);

        const methodResponses: JMAPResponseInvocation[] = [["Mailbox/get", { arg1: "blah", arg2: "foo" }, "c3"]];

        const responseList = manager.createInvocations(methodResponses, reverseIdMap);
        const responses = Array.from(responseList);

        expect(responses[0]).toBeInstanceOf(MailboxInvocation);
        expect(responses[0]?.name).toBe("Mailbox/get");

        expect(mockClientContext.logger.warn).toHaveBeenCalledWith(
            "No corresponding ID found for c3 in the Request Builder",
        );
    });

    it("should return ErrorInvocation for error responses", () => {
        const mockClient = createMockClient();
        const mockClientContext = createMockClientContext();

        const manager = new InvocationFactoryManager(mockClient, mockClientContext);

        const methodResponses: JMAPResponseInvocation[] = [
            ["error", { type: "invalidArguments", description: "Invalid arguments" }, "c1"],
        ];

        const responseList = manager.createInvocations(methodResponses, reverseIdMap);
        const responses = Array.from(responseList);

        expect(responses[0]).toBeInstanceOf(ErrorInvocation);
        expect(responses[0]?.name).toBe("error");
        if (responses[0] instanceof ErrorInvocation) {
            expect(responses[0].arguments).toEqual({ type: "invalidArguments", description: "Invalid arguments" });
        }
    });

    it("should log a warning and default to serverFail if error response is missing type property", () => {
        const mockClient = createMockClient();
        const mockClientContext = createMockClientContext();

        const manager = new InvocationFactoryManager(mockClient, mockClientContext);

        const methodResponses: JMAPResponseInvocation[] = [["error", { description: "Invalid arguments" }, "c1"]];

        const responseList = manager.createInvocations(methodResponses, reverseIdMap);
        const responses = Array.from(responseList);

        expect(responses[0]).toBeInstanceOf(ErrorInvocation);
        expect(responses[0]?.name).toBe("error");
        if (responses[0] instanceof ErrorInvocation) {
            expect(responses[0].arguments).toEqual({ description: "Invalid arguments", type: "serverFail" });
        }

        expect(mockClientContext.logger.warn).toHaveBeenCalledWith(
            'Error response missing "type" property for invocation with ID: c1, defaulting to "serverFail"',
        );
    });

    it("should log a warning and use a new symbol if reverseIdMap is missing for error", () => {
        const mockClient = createMockClient();
        const mockClientContext = createMockClientContext();

        const manager = new InvocationFactoryManager(mockClient, mockClientContext);

        const methodResponses: JMAPResponseInvocation[] = [
            ["error", { type: "invalidArguments", description: "Invalid arguments" }, "c3"],
        ];

        const responseList = manager.createInvocations(methodResponses, reverseIdMap);
        const responses = Array.from(responseList);

        expect(responses[0]).toBeInstanceOf(ErrorInvocation);
        expect(responses[0]?.name).toBe("error");

        expect(mockClientContext.logger.warn).toHaveBeenCalledWith(
            "No corresponding ID found for c3 in the Request Builder",
        );
    });
});
