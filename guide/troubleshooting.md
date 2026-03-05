---
title: Troubleshooting
---

# Troubleshooting

This guide is organised by symptom — what you see when something goes wrong — so you can quickly find the relevant section and resolve the issue.

## Enabling diagnostics

Before diagnosing any issue, make sure you have visibility into what the library is doing. See [Customisation](customisation.md) for full details.

### Attach a logger

Even `console` is sufficient to get started:

```typescript
const client = new JMAPClient(transport, {
    hostname: "api.example.com",
    logger: console,
});
```

The library uses four log levels, from most to least severe:

| Level   | What it covers                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| `error` | Failures — connection errors, request failures, validation failures                                             |
| `warn`  | Potential issues — session staleness, capabilities stripped during connection, missing response IDs             |
| `info`  | Lifecycle events — status changes, capability registration, requests sent/received, invocations constructed     |
| `debug` | Detailed diagnostics — connection URLs, concurrency queue stats, method-level tracing (development builds only) |

The `error`, `warn`, and `info` levels are always active. The `debug` level is only available in development builds (see below).

### Attach an event emitter

Structured error events provide programmatic access to failures:

```typescript
client.withEmitter((name, payload) => {
    console.log(`[${name}]`, payload);
});
```

### Enable debug messages

The library logs detailed diagnostics at the `debug` level. Provide a logger whose `debug` method writes to your preferred output (console, file, etc.) to see these messages.

## Connection problems

### [error] "Cannot connect to JMAP server without a hostname"

**Cause:** `connect()` was called before setting a hostname.

**Fix:** Call `withHostname()` before `connect()`, or pass `hostname` in the constructor options.

```typescript
const client = new JMAPClient(transport, { hostname: "api.example.com" });
// or
client.withHostname("api.example.com");
await client.connect();
```

### [error] "Cannot change hostname after connecting to a JMAP server" / "Cannot change port after connecting to a JMAP server"

**Cause:** `withHostname()` or `withPort()` was called while the client is connected, connecting, or disconnecting.

**Fix:** Disconnect first, then reconfigure:

```typescript
await client.disconnect();
client.withHostname("new-host.example.com");
await client.connect();
```

### [error] "Cannot reconnect while disconnecting"

**Cause:** `connect()` was called while a `disconnect()` is still in progress.

**Fix:** Wait for `disconnect()` to resolve before calling `connect()`:

```typescript
await client.disconnect();
await client.connect();
```

### [error] "JMAP Client disconnected due to an invalid session response"

**Cause:** The server returned a response to the `.well-known/jmap` request that failed structural validation. The `error.cause` contains the Zod validation error with specific details about what was wrong.

**Likely reasons:**

- The URL does not point to a JMAP-compliant server
- The server returned HTML (e.g. a login page) instead of JSON
- The server's session object is missing required fields

**Fix:** Verify the hostname points to a JMAP server and check the Zod error details for specifics.

### [error] "JMAP Client disconnected due to a transport error"

**Cause:** A network-level failure occurred during session discovery. This covers DNS failures, connection refused, TLS errors, authentication failures, HTTP errors, and anything else the Transport throws that is not a Zod validation error or abort.

**Fix:** Check your Transport implementation, network connectivity, and credentials. Inspect the `error` property in the log for the underlying cause.

### [error] "JMAP Client disconnected due to connection being aborted"

**Cause:** `disconnect()` was called while `connect()` was in progress, or the `AbortSignal` passed to `connect()` was aborted.

**Fix:** This is usually intentional. If unexpected, check your code for race conditions between `connect()` and `disconnect()` calls.

### [error] "Core server capability validation failed"

**Cause:** The server's Core capability data (`urn:ietf:params:jmap:core`) did not match the expected schema — for example, missing `maxObjectsInGet`, `maxCallsInRequest`, or wrong types. This is a fatal error; the connection is refused.

**Fix:** This indicates a non-compliant server. Check the error message for specific validation failures. The Core capability schema expects fields like `maxSizeUpload`, `maxConcurrentUpload`, `maxSizeRequest`, `maxConcurrentRequests`, `maxCallsInRequest`, `maxObjectsInGet`, `maxObjectsInSet`, and `collationAlgorithms`.

### [warn] Invalid capabilities

**Symptom:** The `invalid-capabilities` event fires with `context: "connection"` and log messages say "Stripping server capability {uri}" or "Stripping account capability {uri} from account {accountId}".

**Cause:** Non-Core capabilities failed schema validation during connection. The client continues to function, but without those capabilities. This happens when a server returns non-standard capability data that doesn't match the registered schema.

**Fix:** Listen for the `invalid-capabilities` event to see which capabilities were removed and why. If you need those capabilities, check that the server returns data matching the expected schema. You can also register custom capability definitions with looser schemas if needed.

### [error] Capability registration rejected

**Symptom:** The `invalid-capabilities` event fires with `context: "registration"` and log messages say "Rejecting capability {uri}".

**Cause:** A capability was registered after the client was already connected, and its schema validation failed against the existing session data. The capability is not registered.

**Fix:** Check the returned `CapabilityRegistrationResult` for failure details. Ensure the capability's schema matches the server's session data, or register the capability before connecting.

### [warn] "No core capabilities found, using default concurrency limits"

**Cause:** The Core capability was not found in the session's server capabilities when updating concurrency limits. This should not happen with a compliant JMAP server.

**Fix:** Verify the server includes `urn:ietf:params:jmap:core` in its session capabilities. The client will fall back to a default concurrency of 4 for both uploads and requests.

## Request building errors

### [error] "Unknown capability: {uri}"

**Cause:** An invocation was added to the request builder whose capability URI has not been registered with the client.

**Fix:** Register the capability before building requests:

```typescript
import { EmailCapability } from "jmap-kit";

client.registerCapabilities(EmailCapability);
```

### [error] "Cannot add method: Request would exceed the server limit of N method calls"

**Cause:** Adding this method call would exceed the server's `maxCallsInRequest` limit from the Core capability.

**Fix:** Split your operations across multiple requests.

### [error] Validation failures

When `serialize()` or `send()` is called, the request goes through four validation phases. Failures throw an `AggregateError` containing all individual validation errors.

**Invocation validation** — per-invocation checks run first:

- `maxObjectsInGet` — "Request contains N objects, but server limit is M"
- `maxObjectsInSet` — "Request contains N operations, but server limit is M"
- Read-only account — 'Account "X" is read-only'
- Account capability support — 'Account "X" does not support the Y capability.'

**Pre-build validation** — request-level structure checks:

- `maxCallsInRequest` — "Request contains N methods, but server limit is M"

**Pre-serialization validation** — checks on the transformed request (used by custom plugins).

**Post-serialization validation** — checks on the serialised request body:

- `maxSizeRequest` — "Request size (N MB) exceeds server limit of M MB"

The errors listed above come from the Core capability's built-in validation plugins. Additional registered capabilities may provide their own validation plugins with different error messages — see [Plugins](plugins.md) for details on the plugin system.

**Fix for all validation errors:** Reduce the batch size, split into multiple requests, or use a different account. Read-only errors mean you need a writable account for that operation. Capability support errors mean the account doesn't have the required capability in its `accountCapabilities`.

## API request errors

### JMAPRequestError

A `JMAPRequestError` represents a JMAP protocol error conforming to [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807.html) Problem Details. These are request-level errors returned by the server (not per-method errors).

**Inspecting the error:**

```typescript
try {
    await request.send();
} catch (error) {
    if (error instanceof JMAPRequestError) {
        console.log(error.type); // Error type URI
        console.log(error.status); // HTTP status code
        console.log(error.problemDetails); // Full RFC 7807 object
    }
}
```

**Common error types:**

| Type URI                                       | Meaning                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `urn:ietf:params:jmap:error:unknownCapability` | Request uses a capability the server doesn't support              |
| `urn:ietf:params:jmap:error:notJSON`           | Request body was not valid JSON or had wrong Content-Type         |
| `urn:ietf:params:jmap:error:notRequest`        | Valid JSON but did not match the JMAP request structure           |
| `urn:ietf:params:jmap:error:limit`             | Server-side limit exceeded (distinct from client-side validation) |

The `request-error` event is also emitted for these errors.

### Transport errors

Non-`JMAPRequestError` exceptions during API requests indicate network or transport failures — timeouts, connection resets, authentication rejections, etc. These are whatever the Transport implementation throws.

The `transport-error` event is emitted for these errors.

### [error] "Cannot send API request, client {status}"

**Cause:** `sendAPIRequest()` was called while the client is disconnected or disconnecting.

**Fix:** Ensure you are connected before sending requests:

```typescript
await client.connect();
const response = await request.send();
```

### [error] "Failed to send API request, client failed to connect"

**Cause:** The client was connecting when `sendAPIRequest()` was called, but the connection failed before the request could be sent.

**Fix:** Handle the connection failure first, then retry:

```typescript
try {
    await client.connect();
} catch (error) {
    // Handle connection failure
}
```

## Session staleness

### [warn] "JMAP Server session state has changed"

**Symptom:** A warning is logged saying "JMAP Server session state has changed; client may be out of sync. Reconnection recommended." The `session-stale` event fires with `oldSessionState` and `newSessionState`.

**Cause:** The server's `sessionState` in an API response differs from the state received during `connect()`. This means server-side changes have occurred — accounts may have been added or removed, capabilities may have changed, or URLs may have been updated.

**Fix:** Reconnect to refresh the session:

```typescript
client.withEmitter((name, payload) => {
    if (name === "session-stale") {
        client.connect();
    }
});
```

## File operation errors

### Upload errors

**[error] "Server capabilities not available"** — Thrown by `uploadFile()` when server capabilities are null. This shouldn't happen if you're connected; it indicates an internal state issue.

**[error] "File size (N) exceeds server's maximum upload size (M)"** — The file is larger than the server's `maxSizeUpload` limit from the Core capability. Check the limit via `client.serverCapabilities["urn:ietf:params:jmap:core"].maxSizeUpload`.

**[error] `JMAPRequestError` during upload** — The server rejected the upload. The `upload-error` event is emitted with the `accountId` and `error`.

**[error] Transport error during upload** — A network failure occurred. The `transport-error` event is emitted.

### Download errors

**[error] `JMAPRequestError` during download** — The server rejected the download request. The `download-error` event is emitted with the `accountId`, `blobId`, and `error`.

**[error] Transport error during download** — A network failure occurred. The `transport-error` event is emitted.

### URL validation errors

**[error] "Account {accountId} not found in session"** — Thrown by `getDownloadUrl()` or `getUploadUrl()` when the provided `accountId` is not in the session's accounts. This is a Zod validation error. Verify the account ID is correct and present in `client.accounts`.

## Response handling

### [error] "No response factory function available for {name}"

**Cause:** The server returned a method response (e.g. `Email/get`, `Mailbox/set`) for which no factory function is registered. This means the capability that defines this method has not been registered.

**Fix:** Register the capability that handles this response type:

```typescript
import { EmailCapability } from "jmap-kit";

client.registerCapabilities(EmailCapability);
```

### [warn] "No corresponding ID found for {id} in the Request Builder"

**Cause:** The server's response contains a method call ID that was not present in the request. This typically indicates a server bug.

### [info] "No handler found for invocation: {name}"

**Cause:** The `dispatch()` method on the response's `InvocationList` could not find a handler for a particular invocation. No handler matched by ID, method name, or data type, and no default handler was provided.

**Fix:** Add a handler for the method name, data type, or provide a default handler:

```typescript
response.methodResponses.dispatch(
    {
        "Email/get": (invocation) => {
            /* handle */
        },
        Email: (invocation) => {
            /* handle all Email methods */
        },
        error: (invocation) => {
            /* handle errors */
        },
    },
    (invocation) => {
        // Default handler for unmatched invocations
    },
);
```

### Error invocations

These are per-method errors returned by the server within the `methodResponses` array (distinct from request-level `JMAPRequestError`). They are dispatched to the `error` handler in `dispatch()`.

Common error types (defined by the server, not the library):

- `serverFail` — Internal server error
- `notFound` — Requested resource not found
- `invalidArguments` — Method arguments were invalid
- `forbidden` — Insufficient permissions
- `accountNotFound` — Account ID doesn't exist
- `accountReadOnly` — Account doesn't allow modifications

See [RFC 8620 Section 3.6.2](https://www.rfc-editor.org/rfc/rfc8620#section-3.6.2) for the full list of standard error types and their meanings.

## Events reference

| Event                  | Indicates                          | Action                           |
| ---------------------- | ---------------------------------- | -------------------------------- |
| `status-changed`       | Connection state transition        | Informational                    |
| `session-stale`        | Server session has changed         | Reconnect                        |
| `invalid-capabilities` | Capability data failed validation  | Check server compliance          |
| `request-error`        | JMAP protocol error on API request | Inspect `error.problemDetails`   |
| `transport-error`      | Network/transport failure          | Check connectivity and Transport |
| `upload-error`         | JMAP protocol error on upload      | Inspect `error.problemDetails`   |
| `download-error`       | JMAP protocol error on download    | Inspect `error.problemDetails`   |

See [Customisation — Events](customisation.md#events) for event payload details.
