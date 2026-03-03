import { idGenerator } from "./utils.js";

describe("idGenerator", () => {
    it("should generate sequential IDs starting from 0", () => {
        const generate = idGenerator();

        expect(generate.next().value).toBe("0");
        expect(generate.next().value).toBe("1");
        expect(generate.next().value).toBe("2");
        expect(generate.next().value).toBe("3");
        expect(generate.next().value).toBe("4");
    });

    it("should include the specified prefix", () => {
        const generate = idGenerator("id_");

        expect(generate.next().value).toBe("id_0");
        expect(generate.next().value).toBe("id_1");
        expect(generate.next().value).toBe("id_2");
    });

    it("should safely exceed Number.MAX_SAFE_INTEGER", () => {
        const generate = idGenerator("id_", Number.MAX_SAFE_INTEGER - 1);

        expect(generate.next().value).toBe("id_9007199254740990");
        expect(generate.next().value).toBe("id_9007199254740991");
        expect(generate.next().value).toBe("id_9007199254740992");
        expect(generate.next().value).toBe("id_9007199254740993");
    });

    it("should generate unique IDs", () => {
        const generate = idGenerator();

        const ids = new Set();

        for (let i = 0; i < 100; i++) {
            ids.add(generate.next().value);
        }

        expect(ids.size).toBe(100);
    });
});
