---
title: Getting Started
---

# Getting Started

## What is JMAP?

[JMAP](https://jmap.io/) (JSON Meta Application Protocol) is a modern, efficient protocol for synchronising mail, contacts, and calendars. It replaces older protocols like IMAP with a stateless, JSON-based API designed for fast, reliable client-server communication. JMAP is defined in [RFC 8620](https://www.rfc-editor.org/rfc/rfc8620.html) (core) and [RFC 8621](https://www.rfc-editor.org/rfc/rfc8621.html) (mail).

## What jmap-kit provides

jmap-kit is a typed JavaScript/TypeScript library for building JMAP clients. It handles:

- **Session management** — discovery via `.well-known/jmap`, session state tracking, staleness detection
- **Request building** — type-safe invocation factories, automatic capability URI inclusion, result references
- **Response dispatching** — handler-based dispatch by method name, data type, or invocation ID
- **File operations** — upload and download with server limit enforcement and concurrency control
- **Plugin system** — validation and transformation hooks at each stage of request processing
- **Full type safety** — every method call, argument, and response is typed according to the relevant RFCs

## Architecture overview

The library is organised around these core concepts:

1. **Transport** — an interface you provide that handles HTTP requests (including authentication)
2. **JMAPClient** — manages the connection lifecycle, session state, and server communication
3. **Capabilities** — registered definitions that describe what methods are available (Mailbox, Email, etc.)
4. **Invocations** — individual JMAP method calls created via type-safe factory functions
5. **RequestBuilder** — batches multiple invocations into a single JMAP request
6. **InvocationList** — the parsed response, supporting dispatch, iteration, and lookup

## Installation

```bash
yarn add jmap-kit
```

## Creating a transport

The library does not bundle an HTTP client. Instead, you provide a `Transport` implementation that handles HTTP GET and POST requests, including authentication.

A `Transport` must implement two methods:

```typescript
type Transport = {
    get: <T>(url: string | URL, options?: TransportRequestOptions) => Promise<T>;
    post: <T>(url: string | URL, options?: TransportRequestOptions) => Promise<T>;
};
```

`TransportRequestOptions` includes:

| Property       | Type                                    | Description                                |
| -------------- | --------------------------------------- | ------------------------------------------ |
| `headers`      | `Headers`                               | Additional HTTP headers                    |
| `responseType` | `"json" \| "blob"`                      | Expected response type (default: `"json"`) |
| `signal`       | `AbortSignal`                           | For cancelling the request                 |
| `body`         | `string \| Blob \| ArrayBuffer \| File` | Request body (POST only)                   |

### Example: fetch-based transport

The repository includes an example fetch-based transport in [`examples/basic/`](https://github.com/lachlanhunt/jmap-kit/tree/main/examples/basic) for reference. This example is **not** part of the published library — you must provide your own `Transport` implementation.

Here is a minimal example using the Fetch API with bearer token authentication:

```typescript
import type { Transport, TransportRequestOptions } from "jmap-kit";

function createTransport(bearerToken: string): Transport {
    async function request<T>(method: string, url: string | URL, options: TransportRequestOptions = {}): Promise<T> {
        const headers = new Headers(options.headers);
        headers.set("Authorization", `Bearer ${bearerToken}`);

        const response = await fetch(url.toString(), {
            method,
            headers,
            body: "body" in options ? options.body : undefined,
            signal: options.signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (options.responseType === "blob") {
            return (await response.blob()) as T;
        }
        return (await response.json()) as T;
    }

    return {
        get: <T>(url: string | URL, options?: TransportRequestOptions) => request<T>("GET", url, options),
        post: <T>(url: string | URL, options?: TransportRequestOptions) => request<T>("POST", url, options),
    };
}
```

For custom authentication schemes or different HTTP libraries, implement the `Transport` interface directly. See [Customisation](customisation.md) for a detailed guide on transport requirements and error handling.

## Creating a client

```typescript
import { JMAPClient } from "jmap-kit";

const client = new JMAPClient(transport, {
    hostname: "api.example.com",
    // port: 443,    // default
    // logger: ...,  // optional, see Customisation
    // emitter: ..., // optional, see Customisation
});
```

The `hostname` and optional `port` tell the client where to discover the JMAP session. The default port is 443.

## Connecting

```typescript
await client.connect();
```

`connect()` performs session discovery by fetching `https://{hostname}:{port}/.well-known/jmap`. The server returns a session object containing:

- Available capabilities and their configuration
- Account information (IDs, names, permissions)
- Primary account mappings per capability
- URL templates for the API endpoint, file uploads, downloads, and event sources

After connecting, the client validates capability data in the session against any schemas provided by registered capabilities, strips invalid non-Core capabilities, and configures itself according to the server's capabilities (e.g., concurrency limits, maximum request sizes). See [Capabilities](capabilities.md#session-capability-validation) for details.

`connect()` is idempotent — calling it while a connection is in progress returns the same promise. It throws if called while disconnecting.

## Registering capabilities

Before making method calls for a particular data type, register the corresponding capability:

```typescript
import { EmailCapability } from "jmap-kit";

client.registerCapabilities(EmailCapability);
```

The Core capability is always registered automatically. See [Capabilities](capabilities.md) for the full list of built-in capabilities.

## Disconnecting

```typescript
await client.disconnect();
```

Disconnecting aborts all in-flight requests, waits for them to settle, and clears the session state. Like `connect()`, it is idempotent.

## Connection lifecycle

### Connection status

The client tracks its state via `client.connectionStatus`:

| Status            | Description                                    |
| ----------------- | ---------------------------------------------- |
| `"disconnected"`  | Not connected (initial state)                  |
| `"connecting"`    | Session discovery in progress                  |
| `"connected"`     | Session established, ready to send requests    |
| `"disconnecting"` | Aborting in-flight requests and clearing state |

### Chainable configuration

The following methods are chainable and may be called while the client is disconnected:

```typescript
const client = new JMAPClient(transport, { hostname: "api.example.com" })
    .withHostname("other.example.com")
    .withPort(8443)
    .withHeaders({ "X-Custom": "value" })
    .withLogger(myLogger)
    .withEmitter(myEmitter);
```

### Idempotent connect/disconnect

Both `connect()` and `disconnect()` are idempotent:

- Calling `connect()` while already connecting returns the same promise (no duplicate network requests)
- Calling `disconnect()` while already disconnecting returns the same promise
- Calling `disconnect()` while already disconnected is a no-op

### Disconnect behaviour

When `disconnect()` is called:

1. All in-flight requests are aborted via their `AbortController`
2. The client waits for all active request promises to settle
3. The session is cleared and the status transitions to `"disconnected"`

### Concurrency limits

The client respects server-defined concurrency limits from the core capabilities:

- **Request concurrency** — `maxConcurrentRequests` (default: 4 if not connected)
- **Upload concurrency** — `maxConcurrentUpload` (default: 4 if not connected)

Excess requests and uploads are automatically queued and sent as earlier operations complete.

## Next steps

- [Session](session.md) — accessing session data, accounts, and server capabilities
- [Capabilities](capabilities.md) — understanding and registering JMAP capabilities
- [Invocations](invocations.md) — creating type-safe method calls
