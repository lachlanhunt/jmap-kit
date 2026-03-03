import { VACATIONRESPONSE_CAPABILITY_URI } from "../../common/registry.js";
import { VacationResponse, VacationResponseInvocation } from "./vacationresponse.js";

describe("VacationResponseInvocation class", () => {
    it("should expose the vacationresponse capability URI", () => {
        const test = new VacationResponseInvocation("test", {
            accountId: "example",
        });

        expect(test.uri).toBe(VACATIONRESPONSE_CAPABILITY_URI);
    });
});

describe("VacationResponse object", () => {
    it("should create the VacationResponse/get method", () => {
        const test = VacationResponse.request.get({
            accountId: "example",
        });

        expect(test.name).toBe("VacationResponse/get");
    });

    it("should expose the vacationresponse capability URI on VacationResponseInvocation instances", () => {
        const test = VacationResponse.request.get({
            accountId: "example",
        });

        expect(test.uri).toBe(VACATIONRESPONSE_CAPABILITY_URI);
    });

    it("should create the VacationResponse/get method with the expected arguments", () => {
        const test = VacationResponse.request.get({
            accountId: "example",
            ids: ["singleton"],
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("ids")).toBe(true);
        expect(test.hasArgument("properties")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("ids")).toHaveLength(1);
    });

    it("should create the VacationResponse/set method with the expected arguments", () => {
        const test = VacationResponse.request.set({
            accountId: "example",
            update: {
                singleton: { isEnabled: true },
            },
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("update")).toBe(true);
        expect(test.hasArgument("ifInState")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
    });
});
