---
title: Customisation
---

# Customisation

The client accepts three optional extension points: a custom transport, a logger, and an event emitter. Each can be set at construction time or configured later via chainable methods (while disconnected).

## Custom transport

The `Transport` interface is the only required dependency. It handles all HTTP communication, including authentication.

### Interface

```typescript
type Transport = {
    get: <T>(url: string | URL, options?: TransportRequestOptions) => Promise<T>;
    post: <T>(url: string | URL, options?: TransportRequestOptions) => Promise<T>;
};
```

Both methods receive a `TransportRequestOptions` object:

| Property       | Type                                    | Description                                  |
| -------------- | --------------------------------------- | -------------------------------------------- |
| `headers`      | `Headers`                               | Additional HTTP headers to include           |
| `responseType` | `"json" \| "blob"`                      | Expected response format (default: `"json"`) |
| `signal`       | `AbortSignal`                           | For cancelling the request                   |
| `body`         | `string \| Blob \| ArrayBuffer \| File` | Request body (POST only)                     |

### Expected behaviour

- When `responseType` is `"json"` (the default), parse the response body as JSON and return the result
- When `responseType` is `"blob"`, return the response body as a `Blob`
- For JMAP protocol errors (non-200 status codes with a JSON body conforming to [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807.html)), throw a `JMAPRequestError`
- For response parsing failures, throw a `TypeError`
- For network errors, timeouts, and other transport failures, throw an `Error`
- When the `signal` is aborted, throw a `DOMException` with `name: "AbortError"`

The client distinguishes between `JMAPRequestError` and other error types when emitting events and logging, so following these conventions ensures correct error categorisation.

### Example: custom transport with Axios

```typescript
import axios from "axios";
import type { Transport, TransportRequestOptions } from "jmap-kit";
import { JMAPRequestError } from "jmap-kit";

function createAxiosTransport(token: string): Transport {
    const instance = axios.create({
        headers: { Authorization: `Bearer ${token}` },
    });

    async function request<T>(
        method: "get" | "post",
        url: string | URL,
        options: TransportRequestOptions = {},
    ): Promise<T> {
        const response = await instance.request({
            method,
            url: url.toString(),
            headers: options.headers ? Object.fromEntries(options.headers.entries()) : undefined,
            data: "body" in options ? options.body : undefined,
            responseType: options.responseType === "blob" ? "blob" : "json",
            signal: options.signal,
        });
        return response.data;
    }

    return {
        get: <T>(url: string | URL, options?: TransportRequestOptions) => request<T>("get", url, options),
        post: <T>(url: string | URL, options?: TransportRequestOptions) => request<T>("post", url, options),
    };
}
```

## Custom logger

The logger receives lifecycle messages, warnings, and errors from the client. It follows the standard `console` method signature.

### Interface

```typescript
type Logger = {
    log: LoggerMethod;
    info: LoggerMethod;
    warn: LoggerMethod;
    error: LoggerMethod;
    debug: LoggerMethod;
};

type LoggerMethod = (message: string, ...optionalParams: any[]) => void;
```

### Setting a logger

```typescript
// At construction
const client = new JMAPClient(transport, {
    hostname: "api.example.com",
    logger: myLogger,
});

// Or later (while disconnected)
client.withLogger(myLogger);
```

### Safety

The library wraps your logger in a try/catch. If your logger throws, the exception is silently caught and ignored — it will never disrupt client operations.

### Debug messages

The library uses `logger.debug()` for internal diagnostics. If your application does not need debug-level messages, configure your logger to ignore them — for example, by providing a no-op `debug` method.

### Example: file-based logger

```typescript
import { appendFileSync } from "node:fs";
import type { Logger } from "jmap-kit";

const fileLogger: Logger = {
    log: (msg) => appendFileSync("jmap.log", `[LOG] ${msg}\n`),
    info: (msg) => appendFileSync("jmap.log", `[INFO] ${msg}\n`),
    warn: (msg) => appendFileSync("jmap.log", `[WARN] ${msg}\n`),
    error: (msg) => appendFileSync("jmap.log", `[ERROR] ${msg}\n`),
    debug: (msg) => appendFileSync("jmap.log", `[DEBUG] ${msg}\n`),
};
```

## Event emitter

The event emitter receives structured events from the client. You can use it to integrate with any event system (EventEmitter, RxJS, framework stores, etc.).

### Interface

```typescript
type EventEmitterFn = <E extends keyof JMAPClientEvents>(name: E, payload: JMAPClientEvents[E]) => void;
```

### Setting an emitter

```typescript
// At construction
const client = new JMAPClient(transport, {
    hostname: "api.example.com",
    emitter: (name, payload) => {
        console.log(`[${name}]`, payload);
    },
});

// Or later (while disconnected)
client.withEmitter(myEmitter);
```

### Events

| Event                    | Payload                                                                                                                | When emitted                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `"status-changed"`       | `{ status: string, sessionState: string \| null }`                                                                     | Connection status transitions           |
| `"session-stale"`        | `{ oldSessionState: string \| null, newSessionState: string }`                                                         | Server session state differs from local |
| `"invalid-capabilities"` | `{ context: "connection" \| "registration", serverCapabilities: FailedResult[], accountCapabilities: FailedResult[] }` | Capabilities failed schema validation   |
| `"request-error"`        | `{ error: JMAPRequestError }`                                                                                          | JMAP protocol error on an API request   |
| `"transport-error"`      | `{ error: unknown }`                                                                                                   | Network or transport failure            |
| `"upload-error"`         | `{ accountId: Id, error: JMAPRequestError }`                                                                           | File upload failed with a JMAP error    |
| `"download-error"`       | `{ accountId: Id, blobId: Id, error: JMAPRequestError }`                                                               | File download failed with a JMAP error  |

The `"invalid-capabilities"` event is emitted when one or more capabilities fail schema validation. The `context` field indicates whether the failure occurred during `"connection"` (capabilities are stripped from the session) or `"registration"` (capabilities registered after connection are rejected). Each failure includes the capability `uri`, an `errors` array, and (for account capabilities) the `accountId`. See [Session](session.md#capability-validation) for details.

### Safety

Like the logger, the emitter is wrapped in a try/catch. If your emitter throws, the exception is silently caught and ignored.

### Example: updating UI on status changes

```typescript
client.withEmitter((name, payload) => {
    switch (name) {
        case "status-changed":
            updateConnectionIndicator(payload.status);
            break;
        case "session-stale":
            showNotification("Session has changed. Reconnecting...");
            client.disconnect().then(() => client.connect());
            break;
        case "request-error":
            showError(`Request failed: ${payload.error.type}`);
            break;
    }
});
```

### Example: bridging to Node.js EventEmitter

```typescript
import { EventEmitter } from "node:events";

const emitter = new EventEmitter();

client.withEmitter((name, payload) => {
    emitter.emit(name, payload);
});

// Subscribe to specific events
emitter.on("session-stale", ({ oldSessionState, newSessionState }) => {
    console.log(`Session changed: ${oldSessionState} -> ${newSessionState}`);
});
```
