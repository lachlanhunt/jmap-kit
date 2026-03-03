import type { ConnectionStatus } from "../types.js";

/**
 * Assert that the connection status is 'connected'.
 * @param status - The current connection status.
 * @throws Error if the status is not 'connected'.
 */
export function assertConnected(status: ConnectionStatus): asserts status is "connected" {
    if (status !== "connected") {
        throw new Error("Client is not connected to a JMAP server");
    }
}
