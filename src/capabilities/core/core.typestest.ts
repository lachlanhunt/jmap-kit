import { Core } from "./core.js";

// @ts-expect-error Expected 1 arguments, but got 0
Core.request.echo();

// Empty object is valid (Core/echo accepts any args)
Core.request.echo({});

// Arbitrary properties are accepted
const m1 = Core.request.echo({
    hello: "world",
    number: 42,
    nested: { key: "value" },
    array: [1, 2, 3],
});

// Check properties accept references
Core.request.echo({
    value: m1.createReference("/value"),
});
