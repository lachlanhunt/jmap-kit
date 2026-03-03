import { describe, expect, it } from "vitest";
import { CORE_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability } from "../../common/types.js";
import type { JMAPSessionFromSchema } from "../types.js";
import { filterSessionCapabilities } from "./filter-session-capabilities.js";

const CUSTOM_URI = "https://example.com/custom" as JMAPCapability;
const CUSTOM_URI_2 = "https://example.com/custom2" as JMAPCapability;

const CORE_SERVER_CAPABILITIES = {
    maxSizeUpload: 50_000_000,
    maxConcurrentUpload: 4,
    maxSizeRequest: 10_000_000,
    maxConcurrentRequests: 4,
    maxCallsInRequest: 16,
    maxObjectsInGet: 500,
    maxObjectsInSet: 500,
    collationAlgorithms: ["i;ascii-casemap"],
};

function createTestSession(overrides?: Partial<JMAPSessionFromSchema>): JMAPSessionFromSchema {
    return {
        capabilities: {
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
        },
        accounts: {
            acc1: {
                name: "test@example.com",
                isPersonal: true,
                isReadOnly: false,
                accountCapabilities: {
                    [CORE_CAPABILITY_URI]: {},
                },
            },
        },
        primaryAccounts: {},
        username: "test@example.com",
        apiUrl: "https://api.example.com/jmap/api/",
        downloadUrl: "https://api.example.com/jmap/download/{accountId}/{blobId}/{name}?type={type}",
        uploadUrl: "https://api.example.com/jmap/upload/{accountId}/",
        eventSourceUrl: "https://api.example.com/jmap/event/",
        state: "test-state-1",
        ...overrides,
    };
}

describe("filterSessionCapabilities", () => {
    describe("with no failures", () => {
        it("returns session unchanged", () => {
            const acc1 = "acc1";

            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                },
                accounts: {
                    [acc1]: {
                        name: "test@example.com",
                        isPersonal: true,
                        isReadOnly: false,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { some: "data" },
                        },
                    },
                },
                primaryAccounts: {
                    [CUSTOM_URI]: acc1,
                },
            });

            const result = filterSessionCapabilities(session, [], []);

            expect(result.capabilities[CUSTOM_URI]).toBeDefined();
            expect(result.accounts[acc1]?.accountCapabilities[CUSTOM_URI]).toBeDefined();
            expect(result.primaryAccounts[CUSTOM_URI]).toBe(acc1);
        });

        it("preserves non-capability session fields", () => {
            const session = createTestSession();
            const result = filterSessionCapabilities(session, [], []);

            expect(result.username).toBe("test@example.com");
            expect(result.apiUrl).toBe("https://api.example.com/jmap/api/");
            expect(result.downloadUrl).toBe(
                "https://api.example.com/jmap/download/{accountId}/{blobId}/{name}?type={type}",
            );
            expect(result.uploadUrl).toBe("https://api.example.com/jmap/upload/{accountId}/");
            expect(result.eventSourceUrl).toBe("https://api.example.com/jmap/event/");
            expect(result.state).toBe("test-state-1");
        });
    });

    describe("with server-level failures", () => {
        it("removes the capability from capabilities", () => {
            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                },
            });

            const result = filterSessionCapabilities(session, [{ uri: CUSTOM_URI }], []);

            expect(result.capabilities[CUSTOM_URI]).toBeUndefined();
            expect(result.capabilities[CORE_CAPABILITY_URI]).toBeDefined();
        });

        it("removes the capability from all accounts' accountCapabilities", () => {
            const acc1 = "acc1";
            const acc2 = "acc2";

            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                },
                accounts: {
                    [acc1]: {
                        name: "user1@example.com",
                        isPersonal: true,
                        isReadOnly: false,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { data: "a" },
                        },
                    },
                    [acc2]: {
                        name: "user2@example.com",
                        isPersonal: false,
                        isReadOnly: true,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { data: "b" },
                        },
                    },
                },
            });

            const result = filterSessionCapabilities(session, [{ uri: CUSTOM_URI }], []);

            expect(result.accounts[acc1]?.accountCapabilities[CUSTOM_URI]).toBeUndefined();
            expect(result.accounts[acc2]?.accountCapabilities[CUSTOM_URI]).toBeUndefined();
            // Core is preserved
            expect(result.accounts[acc1]?.accountCapabilities[CORE_CAPABILITY_URI]).toBeDefined();
            expect(result.accounts[acc2]?.accountCapabilities[CORE_CAPABILITY_URI]).toBeDefined();
        });

        it("removes the capability from primaryAccounts", () => {
            const acc1 = "acc1";

            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                },
                primaryAccounts: {
                    [CUSTOM_URI]: acc1,
                },
            });

            const result = filterSessionCapabilities(session, [{ uri: CUSTOM_URI }], []);

            expect(result.primaryAccounts[CUSTOM_URI]).toBeUndefined();
        });

        it("handles multiple server-level failures", () => {
            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                    [CUSTOM_URI_2]: { other: "data" },
                },
                primaryAccounts: {
                    [CUSTOM_URI]: "acc1",
                    [CUSTOM_URI_2]: "acc1",
                },
            });

            const result = filterSessionCapabilities(session, [{ uri: CUSTOM_URI }, { uri: CUSTOM_URI_2 }], []);

            expect(result.capabilities[CUSTOM_URI]).toBeUndefined();
            expect(result.capabilities[CUSTOM_URI_2]).toBeUndefined();
            expect(result.primaryAccounts[CUSTOM_URI]).toBeUndefined();
            expect(result.primaryAccounts[CUSTOM_URI_2]).toBeUndefined();
        });
    });

    describe("with account-level failures", () => {
        it("removes the capability only from the affected account", () => {
            const acc1 = "acc1";
            const acc2 = "acc2";

            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                },
                accounts: {
                    [acc1]: {
                        name: "user1@example.com",
                        isPersonal: true,
                        isReadOnly: false,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { valid: "data" },
                        },
                    },
                    [acc2]: {
                        name: "user2@example.com",
                        isPersonal: false,
                        isReadOnly: true,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { invalid: "data" },
                        },
                    },
                },
            });

            const result = filterSessionCapabilities(session, [], [{ uri: CUSTOM_URI, accountId: acc2 }]);

            // Server capability preserved
            expect(result.capabilities[CUSTOM_URI]).toBeDefined();
            // acc1 keeps the capability
            expect(result.accounts[acc1]?.accountCapabilities[CUSTOM_URI]).toBeDefined();
            // acc2 loses the capability
            expect(result.accounts[acc2]?.accountCapabilities[CUSTOM_URI]).toBeUndefined();
        });

        it("preserves primaryAccounts when the primary account is unaffected", () => {
            const acc1 = "acc1";
            const acc2 = "acc2";

            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                },
                accounts: {
                    [acc1]: {
                        name: "user1@example.com",
                        isPersonal: true,
                        isReadOnly: false,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { valid: "data" },
                        },
                    },
                    [acc2]: {
                        name: "user2@example.com",
                        isPersonal: false,
                        isReadOnly: true,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { invalid: "data" },
                        },
                    },
                },
                primaryAccounts: {
                    [CUSTOM_URI]: acc1,
                },
            });

            const result = filterSessionCapabilities(session, [], [{ uri: CUSTOM_URI, accountId: acc2 }]);

            // primaryAccounts preserved because acc1 (the primary) is fine
            expect(result.primaryAccounts[CUSTOM_URI]).toBe(acc1);
        });

        it("removes primaryAccounts entry when the primary account's capability is stripped", () => {
            const acc1 = "acc1";

            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                },
                accounts: {
                    [acc1]: {
                        name: "user1@example.com",
                        isPersonal: true,
                        isReadOnly: false,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { invalid: "data" },
                        },
                    },
                },
                primaryAccounts: {
                    [CUSTOM_URI]: acc1,
                },
            });

            const result = filterSessionCapabilities(session, [], [{ uri: CUSTOM_URI, accountId: acc1 }]);

            expect(result.accounts[acc1]?.accountCapabilities[CUSTOM_URI]).toBeUndefined();
            expect(result.primaryAccounts[CUSTOM_URI]).toBeUndefined();
        });

        it("handles failures across multiple accounts for the same capability", () => {
            const acc1 = "acc1";
            const acc2 = "acc2";

            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                },
                accounts: {
                    [acc1]: {
                        name: "user1@example.com",
                        isPersonal: true,
                        isReadOnly: false,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { invalid: "data" },
                        },
                    },
                    [acc2]: {
                        name: "user2@example.com",
                        isPersonal: false,
                        isReadOnly: true,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { also: "invalid" },
                        },
                    },
                },
            });

            const result = filterSessionCapabilities(
                session,
                [],
                [
                    { uri: CUSTOM_URI, accountId: acc1 },
                    { uri: CUSTOM_URI, accountId: acc2 },
                ],
            );

            // Server capability preserved — only account data failed
            expect(result.capabilities[CUSTOM_URI]).toBeDefined();
            // Both accounts lose the capability
            expect(result.accounts[acc1]?.accountCapabilities[CUSTOM_URI]).toBeUndefined();
            expect(result.accounts[acc2]?.accountCapabilities[CUSTOM_URI]).toBeUndefined();
        });

        it("handles failures for different capabilities across accounts", () => {
            const acc1 = "acc1";
            const acc2 = "acc2";

            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                    [CUSTOM_URI_2]: { other: "data" },
                },
                accounts: {
                    [acc1]: {
                        name: "user1@example.com",
                        isPersonal: true,
                        isReadOnly: false,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { invalid: "data" },
                            [CUSTOM_URI_2]: { valid: "data" },
                        },
                    },
                    [acc2]: {
                        name: "user2@example.com",
                        isPersonal: false,
                        isReadOnly: true,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { valid: "data" },
                            [CUSTOM_URI_2]: { invalid: "data" },
                        },
                    },
                },
            });

            const result = filterSessionCapabilities(
                session,
                [],
                [
                    { uri: CUSTOM_URI, accountId: acc1 },
                    { uri: CUSTOM_URI_2, accountId: acc2 },
                ],
            );

            // acc1: loses CUSTOM_URI, keeps CUSTOM_URI_2
            expect(result.accounts[acc1]?.accountCapabilities[CUSTOM_URI]).toBeUndefined();
            expect(result.accounts[acc1]?.accountCapabilities[CUSTOM_URI_2]).toBeDefined();
            // acc2: keeps CUSTOM_URI, loses CUSTOM_URI_2
            expect(result.accounts[acc2]?.accountCapabilities[CUSTOM_URI]).toBeDefined();
            expect(result.accounts[acc2]?.accountCapabilities[CUSTOM_URI_2]).toBeUndefined();
        });
    });

    describe("with combined server and account failures", () => {
        it("applies both server and account filtering", () => {
            const acc1 = "acc1";

            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                    [CUSTOM_URI_2]: { other: "data" },
                },
                accounts: {
                    [acc1]: {
                        name: "test@example.com",
                        isPersonal: true,
                        isReadOnly: false,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { data: "a" },
                            [CUSTOM_URI_2]: { data: "b" },
                        },
                    },
                },
                primaryAccounts: {
                    [CUSTOM_URI]: acc1,
                    [CUSTOM_URI_2]: acc1,
                },
            });

            const result = filterSessionCapabilities(
                session,
                [{ uri: CUSTOM_URI }],
                [{ uri: CUSTOM_URI_2, accountId: acc1 }],
            );

            // CUSTOM_URI stripped at server level
            expect(result.capabilities[CUSTOM_URI]).toBeUndefined();
            expect(result.accounts[acc1]?.accountCapabilities[CUSTOM_URI]).toBeUndefined();
            expect(result.primaryAccounts[CUSTOM_URI]).toBeUndefined();
            // CUSTOM_URI_2 stripped at account level
            expect(result.capabilities[CUSTOM_URI_2]).toBeDefined();
            expect(result.accounts[acc1]?.accountCapabilities[CUSTOM_URI_2]).toBeUndefined();
            expect(result.primaryAccounts[CUSTOM_URI_2]).toBeUndefined();
        });
    });

    describe("immutability", () => {
        it("deep-freezes the returned session", () => {
            const acc1 = "acc1";
            const session = createTestSession();
            const result = filterSessionCapabilities(session, [], []);

            expect(Object.isFrozen(result)).toBe(true);
            expect(Object.isFrozen(result.capabilities)).toBe(true);
            expect(Object.isFrozen(result.accounts)).toBe(true);
            expect(Object.isFrozen(result.accounts[acc1])).toBe(true);
            expect(Object.isFrozen(result.primaryAccounts)).toBe(true);
        });

        it("does not mutate the original session", () => {
            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                },
            });

            filterSessionCapabilities(session, [{ uri: CUSTOM_URI }], []);

            expect(session.capabilities[CUSTOM_URI]).toBeDefined();
        });

        it("does not mutate the original accounts", () => {
            const acc1 = "acc1";
            const session = createTestSession({
                capabilities: {
                    [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
                    [CUSTOM_URI]: { some: "data" },
                },
                accounts: {
                    [acc1]: {
                        name: "test@example.com",
                        isPersonal: true,
                        isReadOnly: false,
                        accountCapabilities: {
                            [CORE_CAPABILITY_URI]: {},
                            [CUSTOM_URI]: { some: "data" },
                        },
                    },
                },
            });

            filterSessionCapabilities(session, [], [{ uri: CUSTOM_URI, accountId: acc1 }]);

            expect(session.accounts[acc1]?.accountCapabilities[CUSTOM_URI]).toBeDefined();
        });
    });
});
