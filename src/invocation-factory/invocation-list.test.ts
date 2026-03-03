import { describe, expect, it, vi } from "vitest";
import type { MailboxInvocation } from "../capabilities/mailbox/mailbox.js";
import type { MailboxGetResponseInvocationArgs } from "../capabilities/mailbox/types.js";
import type { JMAPCapability, JMAPDataType, JMAPMethodName } from "../common/types.js";
import { ErrorInvocation } from "../invocation/error-invocation.js";
import { Invocation } from "../invocation/invocation.js";
import type { BaseInvocationArgs } from "../invocation/types.js";
import { createMockClientContext } from "../jmap-client/test-utils.js";
import { InvocationList } from "./invocation-list.js";

// Dummy invocation class for testing
class DummyInvocation extends Invocation<BaseInvocationArgs> {
    get uri(): JMAPCapability {
        /* istanbul ignore next */
        return "https://example.com/jmap-dummy";
    }

    constructor(dataType: JMAPDataType, method: JMAPMethodName) {
        super(dataType, method, {}, Symbol());
    }
}

describe("InvocationList", () => {
    it("should iterate over invocations", () => {
        const inv1 = new DummyInvocation("Mailbox", "get");
        const inv2 = new DummyInvocation("Email", "copy");
        const mockClientContext = createMockClientContext();
        const list = new InvocationList([inv1, inv2], mockClientContext);
        const result = Array.from(list);
        expect(result).toEqual([inv1, inv2]);
    });

    it("should return the correct size", () => {
        const inv1 = new DummyInvocation("Mailbox", "get");
        const inv2 = new DummyInvocation("Email", "copy");
        const mockClientContext = createMockClientContext();
        const list = new InvocationList([inv1, inv2], mockClientContext);
        expect(list.size).toBe(2);
    });

    it("should dispatch to the correct handler", async () => {
        const inv1 = new DummyInvocation("Mailbox", "get");
        const inv2 = new DummyInvocation("Email", "copy");
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        const mockClientContext = createMockClientContext();
        const list = new InvocationList([inv1, inv2], mockClientContext);
        await list.dispatch({
            "Mailbox/get": handler1,
            "Email/copy": handler2,
        });
        expect(handler1).toHaveBeenCalledWith(inv1);
        expect(handler2).toHaveBeenCalledWith(inv2);
        expect(mockClientContext.logger.debug).toHaveBeenCalledWith(
            "Dispatching invocation for Mailbox/get to handler: Mailbox/get",
        );
        expect(mockClientContext.logger.debug).toHaveBeenCalledWith(
            "Dispatching invocation for Email/copy to handler: Email/copy",
        );
    });

    it("should prefer id-based handlers over name, data type, and default handlers", async () => {
        const inv1 = new DummyInvocation("Mailbox", "get");
        const idHandler = vi.fn();
        const nameHandler = vi.fn();
        const typeHandler = vi.fn();
        const defaultHandler = vi.fn();
        const mockClientContext = createMockClientContext();
        const list = new InvocationList([inv1], mockClientContext);

        await list.dispatch(
            {
                [inv1.id]: idHandler,
                "Mailbox/get": nameHandler,
                Mailbox: typeHandler,
            },
            defaultHandler,
        );

        expect(idHandler).toHaveBeenCalledWith(inv1);
        expect(nameHandler).not.toHaveBeenCalled();
        expect(typeHandler).not.toHaveBeenCalled();
        expect(defaultHandler).not.toHaveBeenCalled();
        expect(mockClientContext.logger.debug).toHaveBeenCalledWith(
            `Dispatching invocation for Mailbox/get to handler by ID`,
        );
    });

    it("should route each invocation by id even when method names match", async () => {
        const inv1 = new DummyInvocation("Mailbox", "get");
        const inv2 = new DummyInvocation("Mailbox", "get");
        const inv3 = new DummyInvocation("Mailbox", "get");
        const idHandler1 = vi.fn();
        const idHandler2 = vi.fn();
        const nameHandler = vi.fn();
        const mockClientContext = createMockClientContext();
        const list = new InvocationList([inv1, inv2, inv3], mockClientContext);

        await list.dispatch({
            [inv1.id]: idHandler1,
            [inv2.id]: idHandler2,
            "Mailbox/get": nameHandler,
        });

        expect(idHandler1).toHaveBeenCalledWith(inv1);
        expect(idHandler2).toHaveBeenCalledWith(inv2);
        expect(nameHandler).toHaveBeenCalledWith(inv3);
        expect(mockClientContext.logger.debug).toHaveBeenCalledWith(
            `Dispatching invocation for Mailbox/get to handler by ID`,
        );
        expect(mockClientContext.logger.debug).toHaveBeenCalledWith(
            `Dispatching invocation for Mailbox/get to handler by ID`,
        );
    });

    it("should call default handler for unhandled methods", async () => {
        const inv1 = new DummyInvocation("Mailbox", "get");
        const inv2 = new DummyInvocation("Unknown", "method");
        const handler1 = vi.fn();
        const defaultHandler = vi.fn();
        const mockClientContext = createMockClientContext();
        const list = new InvocationList([inv1, inv2], mockClientContext);
        await list.dispatch(
            {
                "Mailbox/get": handler1,
            },
            defaultHandler,
        );
        expect(handler1).toHaveBeenCalledWith(inv1);
        expect(defaultHandler).toHaveBeenCalledWith(inv2);
        expect(mockClientContext.logger.debug).toHaveBeenCalledWith(
            "Dispatching invocation for Mailbox/get to handler: Mailbox/get",
        );
        expect(mockClientContext.logger.debug).toHaveBeenCalledWith(
            "Dispatching invocation for Unknown/method to default handler",
        );
    });

    it("should skip unhandled methods if no default handler is provided", async () => {
        const inv1 = new DummyInvocation("Mailbox", "get");
        const inv2 = new DummyInvocation("Unknown", "method");
        const handler1 = vi.fn<(args: MailboxInvocation<MailboxGetResponseInvocationArgs>) => void>();
        const mockClientContext = createMockClientContext();
        // Simulate a handler that does nothing for the second invocation
        const list = new InvocationList([inv1, inv2], mockClientContext);
        await list.dispatch({
            "Mailbox/get": handler1,
        });
        expect(handler1).toHaveBeenCalledWith(inv1);
        expect(mockClientContext.logger.debug).toHaveBeenCalledWith(
            "Dispatching invocation for Mailbox/get to handler: Mailbox/get",
        );
        expect(mockClientContext.logger.info).toHaveBeenCalledWith("No handler found for invocation: Unknown/method");
    });

    it("should dispatch to the data type handler if no full method handler exists", async () => {
        const inv1 = new DummyInvocation("Mailbox", "get");
        const inv2 = new DummyInvocation("Email", "copy");
        const mailboxHandler = vi.fn();
        const emailHandler = vi.fn();
        const mockClientContext = createMockClientContext();
        const list = new InvocationList([inv1, inv2], mockClientContext);
        await list.dispatch({
            Mailbox: mailboxHandler,
            Email: emailHandler,
        });
        expect(mailboxHandler).toHaveBeenCalledWith(inv1);
        expect(emailHandler).toHaveBeenCalledWith(inv2);
        expect(mockClientContext.logger.debug).toHaveBeenCalledWith(
            "Dispatching invocation for Mailbox/get to handler: Mailbox",
        );
        expect(mockClientContext.logger.debug).toHaveBeenCalledWith(
            "Dispatching invocation for Email/copy to handler: Email",
        );
    });

    it("should include ErrorInvocation in iteration and size", () => {
        const inv1 = new DummyInvocation("Mailbox", "get");
        const error = new ErrorInvocation({ type: "serverFail", description: "fail" }, Symbol("err"));
        const mockClientContext = createMockClientContext();
        const list = new InvocationList([inv1, error], mockClientContext);
        const result = Array.from(list);
        expect(result).toEqual([inv1, error]);
        expect(list.size).toBe(2);
    });

    it("should dispatch to error handler for ErrorInvocation", async () => {
        const error = new ErrorInvocation({ type: "forbidden" }, Symbol("err"));
        const errorHandler = vi.fn();
        const mockClientContext = createMockClientContext();
        const list = new InvocationList([error], mockClientContext);
        await list.dispatch({ error: errorHandler });
        expect(errorHandler).toHaveBeenCalledWith(error);
        expect(mockClientContext.logger.warn).toHaveBeenCalledWith("Dispatching error invocation: forbidden");
    });
});
