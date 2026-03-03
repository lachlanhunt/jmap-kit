import { describe, expect, it } from "vitest";
import { CORE_CAPABILITY_URI } from "../../common/registry.js";
import mockSession from "../../jmap-client/mock-session.json" with { type: "json" };
import type { JMAPAccount } from "../../jmap-client/types.js";
import { Example } from "../example/example.js";
import { createReadOnlyAccountValidator } from "./create-readonly-account-validator.js";

describe("createReadOnlyAccountValidator", () => {
    const serverCapabilities = mockSession.capabilities;

    // Get the first account from mock session for normal account tests
    const normalAccountId = Object.keys(mockSession.accounts)[0] as keyof typeof mockSession.accounts;

    // Add a read-only account for testing
    const accounts: Record<string, JMAPAccount> = {
        ...mockSession.accounts,
        "account-readonly": {
            name: "Read-Only Account",
            isPersonal: true,
            isReadOnly: true,
            accountCapabilities: {
                [CORE_CAPABILITY_URI]: {},
            },
        },
    };

    describe("with dataType and method trigger", () => {
        const validator = createReadOnlyAccountValidator({
            name: "test-prevent-set-on-readonly",
            trigger: { dataType: "Example", method: "set" },
        });

        it("should validate when account is not read-only", async () => {
            const invocation = Example.request.set({
                accountId: normalAccountId,
                create: { ex1: { name: "Test" } },
            });

            const context = {
                invocation,
                accounts,
                serverCapabilities,
            } as const;

            const result = await validator.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should invalidate when account is read-only", async () => {
            const invocation = Example.request.set({
                accountId: "account-readonly",
                create: { ex1: { name: "Test" } },
            });

            const context = {
                invocation,
                accounts,
                serverCapabilities,
            } as const;

            const result = await validator.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error('Account "account-readonly" is read-only'));
        });

        it("should invalidate when account does not exist", async () => {
            const invocation = Example.request.set({
                accountId: "nonexistent",
                create: { ex1: { name: "Test" } },
            });

            const context = {
                invocation,
                accounts,
                serverCapabilities,
            } as const;

            const result = await validator.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error('Account "nonexistent" does not exist.'));
        });

        it("should throw error when invocation type does not match trigger", () => {
            const invocation = Example.request.get({
                accountId: normalAccountId,
                ids: ["ex1"],
            });

            const context = {
                invocation,
                accounts,
                serverCapabilities,
            } as const;

            expect(() => validator.validate(context)).toThrow(
                'Expected invocation to be "Example/set", but got "Example/get"',
            );
        });
    });

    describe("with method-only trigger", () => {
        const validator = createReadOnlyAccountValidator({
            name: "test-prevent-set-on-readonly",
            trigger: { method: "set" },
        });

        it("should validate when account is not read-only", async () => {
            const invocation = Example.request.set({
                accountId: normalAccountId,
                create: { ex1: { name: "Test" } },
            });

            const context = {
                invocation,
                accounts,
                serverCapabilities,
            } as const;

            const result = await validator.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should throw error when method does not match", () => {
            const invocation = Example.request.get({
                accountId: normalAccountId,
                ids: ["ex1"],
            });

            const context = {
                invocation,
                accounts,
                serverCapabilities,
            } as const;

            expect(() => validator.validate(context)).toThrow("Expected invocation method to be 'set', but got 'get'");
        });
    });

    describe("with no dataType or method trigger", () => {
        it("should throw error when trigger has no dataType or method", () => {
            const validator = createReadOnlyAccountValidator({
                name: "test-invalid-trigger",
                trigger: {},
            });

            const invocation = Example.request.set({
                accountId: normalAccountId,
                create: { ex1: { name: "Test" } },
            });

            const context = {
                invocation,
                accounts,
                serverCapabilities,
            } as const;

            expect(() => validator.validate(context)).toThrow(
                'Read-only account validator "test-invalid-trigger" must have at least a dataType or method trigger',
            );
        });
    });

    describe("with dataType-only trigger", () => {
        const validator = createReadOnlyAccountValidator({
            name: "test-prevent-example-on-readonly",
            trigger: { dataType: "Example" },
        });

        it("should validate when account is not read-only", async () => {
            const invocation = Example.request.set({
                accountId: normalAccountId,
                create: { ex1: { name: "Test" } },
            });

            const context = {
                invocation,
                accounts,
                serverCapabilities,
            } as const;

            const result = await validator.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should throw error when dataType does not match", () => {
            // Create a mock invocation with a different dataType
            const invocation = Example.request.get({
                accountId: normalAccountId,
                ids: ["ex1"],
            });

            // Manually override the dataType for testing
            Object.defineProperty(invocation, "dataType", {
                value: "Other",
                configurable: true,
            });

            const context = {
                invocation,
                accounts,
                serverCapabilities,
            } as const;

            expect(() => validator.validate(context)).toThrow(
                "Expected invocation dataType to be 'Example', but got 'Other'",
            );
        });
    });
});
