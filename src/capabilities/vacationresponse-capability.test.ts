import { describe, expect, it } from "vitest";
import { CORE_CAPABILITY_URI, VACATIONRESPONSE_CAPABILITY_URI } from "../common/registry.js";
import type { Id, JMAPServerCapabilities } from "../common/types.js";
import type { JMAPAccount } from "../jmap-client/types.js";
import { VacationResponseCapability, vacationResponseAccountSupportPlugin } from "./vacationresponse-capability.js";
import { VacationResponse } from "./vacationresponse/vacationresponse.js";

describe("VacationResponse Capability Tests", () => {
    const serverCapabilities: Readonly<JMAPServerCapabilities> = {
        [CORE_CAPABILITY_URI]: {
            maxSizeUpload: 50000000,
            maxConcurrentUpload: 4,
            maxSizeRequest: 10000000,
            maxConcurrentRequests: 4,
            maxCallsInRequest: 16,
            maxObjectsInGet: 500,
            maxObjectsInSet: 500,
            collationAlgorithms: ["i;ascii-numeric", "i;ascii-casemap", "i;octet"],
        },
        [VACATIONRESPONSE_CAPABILITY_URI]: {},
    };

    const account123: Readonly<JMAPAccount> = {
        name: "Test Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            [VACATIONRESPONSE_CAPABILITY_URI]: {},
        },
    };

    const accountNoVacationResponse: Readonly<JMAPAccount> = {
        name: "No VacationResponse Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
        },
    };

    const accountReadOnly: Readonly<JMAPAccount> = {
        name: "Read-Only Account",
        isPersonal: true,
        isReadOnly: true,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            [VACATIONRESPONSE_CAPABILITY_URI]: {},
        },
    };

    const accounts: Readonly<Record<Id, JMAPAccount>> = {
        account123: account123,
        accountNoVacationResponse: accountNoVacationResponse,
        "read-only-account": accountReadOnly,
    };

    describe("vacationResponseAccountSupportPlugin", () => {
        it("should validate when account supports VacationResponse capability", async () => {
            const invocation = VacationResponse.request.get({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await vacationResponseAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should invalidate when accountId is missing", async () => {
            const invocation = VacationResponse.request.get({
                accountId: "",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await vacationResponseAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Invocation is missing a valid accountId argument.`));
        });

        it("should invalidate when account does not exist", async () => {
            const invocation = VacationResponse.request.get({
                accountId: "nonexistent",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await vacationResponseAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });

        it("should invalidate when account does not support VacationResponse capability", async () => {
            const invocation = VacationResponse.request.get({
                accountId: "accountNoVacationResponse",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await vacationResponseAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(`Account "accountNoVacationResponse" does not support the VacationResponse capability.`),
            );
        });
    });

    describe("VacationResponseCapability", () => {
        it("should have the correct URI", () => {
            expect(VacationResponseCapability.uri).toBe(VACATIONRESPONSE_CAPABILITY_URI);
        });

        it("should have the required invocations", () => {
            expect(VacationResponseCapability.invocations.VacationResponse.request.get).toBeDefined();
            expect(VacationResponseCapability.invocations.VacationResponse.request.set).toBeDefined();
            expect(VacationResponseCapability.invocations.VacationResponse.response.get).toBeDefined();
            expect(VacationResponseCapability.invocations.VacationResponse.response.set).toBeDefined();
        });

        it("should include the account support validator", () => {
            expect(VacationResponseCapability.validators).toHaveLength(1);
            expect(VacationResponseCapability.validators).toContain(vacationResponseAccountSupportPlugin);
        });
    });
});
