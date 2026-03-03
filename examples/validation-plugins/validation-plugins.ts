import { type Core, Core as CoreFactory, CORE_CAPABILITY_URI } from "../../src/index.js";
import type { CapabilityDefinition, ValidationPlugin } from "../../src/capability-registry/types.js";
import { createExampleClient } from "../utils/env.js";

/*
 * This example demonstrates how to write and register custom validation
 * plugins. It defines a simple validator that requires Core/echo calls to
 * include a "requestId" argument, shows how validation errors are surfaced,
 * and then sends a corrected request that passes validation.
 */

const logSection = (title: string) => {
    console.log(`\n== ${title} ==`);
};

// ---------------------------------------------------------------------------
// 1. Define a custom invocation validator
// ---------------------------------------------------------------------------
logSection("1. Define a custom validator");

/*
 * This validator checks that every Core/echo invocation includes a
 * "requestId" argument. It fires on the "invocation" lifecycle hook,
 * meaning it runs once per method call in the request.
 */
const requireRequestIdPlugin: ValidationPlugin<"invocation"> = {
    name: "require-request-id",
    hook: "invocation",
    trigger: {
        // Only run on Core/echo invocations
        capabilityUri: CORE_CAPABILITY_URI,
        dataType: "Core",
        method: "echo",
    },
    validate(context) {
        const { invocation } = context;

        if (!invocation.hasArgument("requestId")) {
            return {
                valid: false,
                errors: [
                    new Error(
                        `Core/echo invocation is missing a required "requestId" argument. ` +
                            `Add a non-empty "requestId" to identify this call.`,
                    ),
                ],
            };
        }

        return { valid: true };
    },
};

console.log(`Validator "${requireRequestIdPlugin.name}" defined`);
console.log(`  Hook:    ${requireRequestIdPlugin.hook}`);
console.log(
    `  Trigger: dataType=${String(requireRequestIdPlugin.trigger.dataType)}, method=${String(requireRequestIdPlugin.trigger.method)}`,
);

// ---------------------------------------------------------------------------
// 2. Register the validator as part of a lightweight capability
// ---------------------------------------------------------------------------
logSection("2. Register the validator");

/*
 * Validators are registered as part of a CapabilityDefinition. This
 * capability has no invocation factories — it exists solely to add
 * the validator to the pipeline.
 */
const EchoValidationCapability: CapabilityDefinition = {
    uri: "urn:example:echo-validation",
    invocations: {},
    validators: [requireRequestIdPlugin],
};

const client = await createExampleClient({
    capabilities: [EchoValidationCapability],
});

console.log("Registered EchoValidationCapability with the client");

// ---------------------------------------------------------------------------
// 3. Validation error handling — send a request that FAILS validation
// ---------------------------------------------------------------------------
logSection("3. Failing validation");

const badRequest = client.createRequestBuilder().add(
    // This echo call is missing "requestId" — the validator will reject it
    CoreFactory.request.echo({ greeting: "Hello" }),
);

console.log("Sending request WITHOUT requestId...\n");

try {
    await badRequest.send();
    console.log("  (unexpected) Request succeeded — validator did not fire.");
} catch (error: unknown) {
    if (error instanceof AggregateError) {
        console.log(`Caught AggregateError with ${String(error.errors.length)} validation error(s):`);
        for (const e of error.errors) {
            if (e instanceof Error) {
                console.log(`  - ${e.message}`);
            }
        }
    } else if (error instanceof Error) {
        console.log(`Caught Error: ${error.message}`);
    }
}

// ---------------------------------------------------------------------------
// 4. Passing validation — send a corrected request
// ---------------------------------------------------------------------------
logSection("4. Passing validation");

const goodRequest = client
    .createRequestBuilder()
    .add(CoreFactory.request.echo({ greeting: "Hello", requestId: "req-001" }));

console.log("Sending request WITH requestId...\n");

const response = await goodRequest.send();

await response.methodResponses.dispatch({
    "Core/echo": (invocation: ReturnType<typeof Core.response.echo>) => {
        console.log("  Response received:");
        console.log("    greeting: ", invocation.getArgument("greeting"));
        console.log("    requestId:", invocation.getArgument("requestId"));
    },
});

console.log("\nValidation passed — request sent and response received successfully.");

await client.disconnect();
