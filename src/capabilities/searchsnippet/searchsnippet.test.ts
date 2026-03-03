import { EMAIL_CAPABILITY_URI } from "../../common/registry.js";
import { SearchSnippet, SearchSnippetInvocation } from "./searchsnippet.js";

describe("SearchSnippetInvocation class", () => {
    it("should expose the email capability URI", () => {
        const test = new SearchSnippetInvocation("test", {
            accountId: "example",
            emailIds: [],
        });

        expect(test.uri).toBe(EMAIL_CAPABILITY_URI);
    });
});

describe("SearchSnippet object", () => {
    it("should create the SearchSnippet/get method", () => {
        const test = SearchSnippet.request.get({
            accountId: "example",
            emailIds: ["id1"],
        });

        expect(test.name).toBe("SearchSnippet/get");
    });

    it("should expose the email capability URI on SearchSnippetInvocation instances", () => {
        const test = SearchSnippet.request.get({
            accountId: "example",
            emailIds: ["id1"],
        });

        expect(test.uri).toBe(EMAIL_CAPABILITY_URI);
    });

    it("should create the SearchSnippet/get method with the expected arguments", () => {
        const test = SearchSnippet.request.get({
            accountId: "example",
            filter: { text: "search term" },
            emailIds: ["id1", "id2"],
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("filter")).toBe(true);
        expect(test.hasArgument("emailIds")).toBe(true);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("emailIds")).toHaveLength(2);
    });
});
