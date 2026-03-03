import "dotenv/config";
import { z } from "zod";
import type { CapabilityDefinition } from "../../src/capability-registry/types.js";
import { JMAPClient } from "../../src/index.js";
import { createFetchTransport } from "./fetch-transport.js";
import { createExampleLogger } from "./logger.js";

const envSchema = z.object({
    JMAP_BEARER_TOKEN: z.string().min(1, "Bearer token is required"),
    JMAP_HOSTNAME: z.string().default("api.fastmail.com"),
    JMAP_LOG_LEVEL: z.enum(["debug", "info", "log", "warn", "error", "silent"]).default("info"),
});

/**
 * Creates a connected JMAPClient with environment-based configuration.
 *
 * Reads `JMAP_BEARER_TOKEN`, `JMAP_HOSTNAME`, and `JMAP_LOG_LEVEL` from
 * environment variables (or a `.env` file via dotenv), creates a fetch
 * transport with bearer-token auth, and connects to the server.
 *
 * @param options.capabilities Additional capabilities to register before connecting.
 * @returns A connected JMAPClient instance.
 */
export async function createExampleClient(options?: { capabilities?: CapabilityDefinition[] }): Promise<JMAPClient> {
    const env = envSchema.parse(process.env);

    const transport = createFetchTransport({ bearerToken: env.JMAP_BEARER_TOKEN });
    const logger = createExampleLogger(env.JMAP_LOG_LEVEL);
    const client = new JMAPClient(transport, { hostname: env.JMAP_HOSTNAME, logger });

    if (options?.capabilities) {
        await client.registerCapabilities(...options.capabilities);
    }

    await client.connect();
    return client;
}
