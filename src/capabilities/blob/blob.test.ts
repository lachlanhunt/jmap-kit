import { BLOB_CAPABILITY_URI, CORE_CAPABILITY_URI } from "../../common/registry.js";
import { Blob, BlobInvocation } from "./blob.js";

describe("BlobInvocation class", () => {
    it("should expose the blob capability URI", () => {
        const test = new BlobInvocation("test", {
            accountId: "test",
            fromAccountId: "test",
            blobIds: ["test"],
        });
        expect(test.uri).toBe(BLOB_CAPABILITY_URI);
    });

    it("should expose the core capability URI for copy method", () => {
        const test = new BlobInvocation("copy", {
            accountId: "test",
            fromAccountId: "test",
            blobIds: ["test"],
        });
        expect(test.uri).toBe(CORE_CAPABILITY_URI);
    });
});

describe("Blob object", () => {
    it("should have a copy method", () => {
        expect(Blob.request.copy).toBeDefined();
    });

    it("should create the Blob/copy method", () => {
        const test = Blob.request.copy({
            accountId: "test",
            fromAccountId: "test",
            blobIds: ["test"],
        });

        expect(test.name).toBe("Blob/copy");
    });

    it("should expose the core capability URI for Blob/copy on BlobInvocation instances", () => {
        const test = Blob.request.copy({
            accountId: "test",
            fromAccountId: "test",
            blobIds: ["test"],
        });

        expect(test.uri).toBe(CORE_CAPABILITY_URI);
    });

    it("should have a get method", () => {
        expect(Blob.request.get).toBeDefined();
    });

    it("should create the Blob/get method", () => {
        const test = Blob.request.get({
            accountId: "test",
            properties: ["data:asBase64"],
        });

        expect(test.name).toBe("Blob/get");
    });

    it("should expose the blob capability URI for Blob/get on BlobInvocation instances", () => {
        const test = Blob.request.get({
            accountId: "test",
            properties: ["data:asBase64"],
        });

        expect(test.uri).toBe(BLOB_CAPABILITY_URI);
    });

    it("should have a upload method", () => {
        expect(Blob.request.upload).toBeDefined();
    });

    it("should create the Blob/upload method", () => {
        const test = Blob.request.upload({
            accountId: "account1",
            create: {
                b4: {
                    data: [
                        {
                            "data:asText": "The quick brown fox jumped over the lazy dog.",
                        },
                    ],
                },
            },
        });

        expect(test.name).toBe("Blob/upload");
    });

    it("should expose the blob capability URI for Blob/upload on BlobInvocation instances", () => {
        const test = Blob.request.upload({
            accountId: "account1",
            create: {
                b4: {
                    data: [
                        {
                            "data:asBase64": "VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wZWQgb3ZlciB0aGUgbGF6eSBkb2cu",
                        },
                    ],
                },
            },
        });

        expect(test.uri).toBe(BLOB_CAPABILITY_URI);
    });

    it("should have a lookup method", () => {
        expect(Blob.request.lookup).toBeDefined();
    });

    it("should create the Blob/lookup method", () => {
        const test = Blob.request.lookup({
            accountId: "test",
            typeNames: ["test"],
            ids: ["test"],
            list: [
                {
                    id: "test",
                    matchedIds: {
                        test: ["test"],
                    },
                },
            ],
        });

        expect(test.name).toBe("Blob/lookup");
    });

    it("should expose the blob capability URI for Blob/lookup on BlobInvocation instances", () => {
        const test = Blob.request.lookup({
            accountId: "test",
            typeNames: ["test"],
            ids: ["test"],
            list: [
                {
                    id: "test",
                    matchedIds: {
                        test: ["test"],
                    },
                },
            ],
        });

        expect(test.uri).toBe(BLOB_CAPABILITY_URI);
    });
});
