---
title: Security
---

# Security

jmap-kit is a protocol library that does not handle network requests directly. All HTTP communication is delegated to a user-provided [Transport](customisation.md#custom-transport). Security responsibilities are shared between the library, the Transport implementation, and the consuming application.

This page documents the library's security boundaries and provides guidance for Transport implementors and application developers.

## Transport security and authentication

### TLS

Transport implementations should enforce HTTPS for all requests. The library does not inspect or enforce the protocol scheme of URLs received from the JMAP session — it passes them to the Transport as-is.

Be aware that HTTP redirects can downgrade the scheme (HTTPS to HTTP) or hop to a different origin. Transport implementations should re-validate the final URL's scheme and host before sending credentials — for example, by not following redirects automatically, or by checking the redirect target before proceeding.

### Authentication

The library never handles tokens, credentials, or `Authorization` headers. The Transport implementation is responsible for attaching authentication to every request (e.g. Bearer tokens, OAuth credentials). See [Custom transport](customisation.md#custom-transport) for the interface your Transport must implement.

### Token storage

Token and credential storage is entirely the application's concern. The library has no credential storage mechanism.

General guidance:

- Avoid storing tokens in `localStorage` or `sessionStorage` in browser environments — these are accessible to any script on the page (including XSS payloads).
- Prefer `httpOnly` cookies (set by the auth server) or secure server-side token storage. If using cookie-based authentication in a browser, ensure cookies use the `SameSite` attribute (ideally `Strict` or `Lax`) and consider CSRF tokens to protect against cross-site request forgery.
- Rotate and refresh tokens according to your auth provider's guidance.
- Consider the lifetime of tokens and implement automatic refresh before expiry.

### CORS

Cross-Origin Resource Sharing is relevant only for browser-based Transport implementations. The JMAP server must return appropriate CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`, etc.).

The library does not add CORS-related headers — that is the Transport's responsibility. Note that JMAP session discovery via `/.well-known/jmap` and all subsequent API, upload, download, and event source URLs may be on a different origin from your application.

## Handling untrusted server data

Data received from the JMAP server should be treated as untrusted input. The library validates structural correctness (via Zod) and per-capability schemas (via [StandardSchema](capabilities.md#session-capability-validation)), but it does not sanitise the content of individual string values. Strings such as account names, error messages, capability URIs, and Problem Details fields are passed through as-is.

### Logger output

The library passes server-provided strings to the configured [logger](customisation.md#custom-logger) without sanitisation. These include error types, error detail messages, session state values, account IDs, and capability URIs.

If your logger renders output in an HTML context (e.g. a web-based log viewer or admin dashboard), you must escape these strings before inserting them into the DOM. Naively injecting log messages using `innerHTML` or equivalent could lead to script injection (XSS) attacks.

### Event payloads

Events such as `request-error`, `transport-error`, `upload-error`, `download-error`, and `invalid-capabilities` carry data that originates from server responses. See [Events](customisation.md#events) for the full list.

In particular, `JMAPRequestError` exposes a `problemDetails` object that conforms to [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807). This object can contain arbitrary additional properties beyond the standard `type`, `title`, `status`, `detail`, and `instance` fields. Event handlers must not render any of this data in HTML without proper escaping.

### Error messages

`JMAPRequestError.message` is derived from the server-provided `detail`, `title`, or `type` fields (in that order of preference). When displaying error messages to users, always set text content (e.g. `textContent`, not `innerHTML`) or use a framework's built-in escaping.

### Session data

Account names (`name`), capability URIs, and other session strings originate from the server. While the library validates the structural shape of the session and [freezes it](#session-validation-and-immutability) to prevent mutation, it does not sanitise the values of individual string fields.

## Session validation and immutability

The library applies multiple layers of validation and protection to the session object:

1. **Structural validation** — The raw JSON response from the session endpoint is parsed and validated against a Zod schema that enforces the shape required by [RFC 8620 §2](https://www.rfc-editor.org/rfc/rfc8620#section-2): required top-level fields, account structure, and the presence of the Core server capability.

2. **Capability-specific validation** — After structural validation, each registered capability's data is validated against its [StandardSchema](capabilities.md#session-capability-validation) (if provided). Invalid capabilities are stripped rather than causing a connection failure — except for the Core capability, which is mandatory.

3. **Deep freeze** — The validated session object is recursively frozen with `Object.freeze()`. This prevents accidental or malicious mutation at runtime. Any attempt to modify session properties in strict mode will throw a `TypeError`.

See [Session — Capability validation](session.md#capability-validation) for details on how validation failures are handled.

## Third-party code

The client accepts several extension points where third-party code executes within the client's operation. There is no sandboxing — all extension code runs in-process. Only use extensions from sources you trust.

### Capability plugins

Capabilities registered with the client can provide code that runs at various points during the client's lifecycle:

- **Session schemas** (`schema.serverCapability`, `schema.accountCapability`) run during `connect()` via the [StandardSchema](https://github.com/standard-schema/standard-schema) `~standard.validate()` protocol. They receive the raw capability data slice from the session.
- **Validation plugins** run at lifecycle hooks (`pre-build`, `pre-serialization`, `post-serialization`, `invocation`). They receive a read-only view of server capabilities and account data, plus the request being built or the specific invocation being validated.
- **Transformation plugins** run at `pre-serialization` and `post-serialization` hooks. They receive the same context as validation plugins and can **modify** request data — including the serialised request body and HTTP headers.

See [Plugins](plugins.md) for the full plugin lifecycle and [Custom Capabilities](custom-capabilities.md) for how capabilities are defined.

### Logger, event emitter, and Transport

The [logger, event emitter, and Transport](customisation.md) are also external code provided by the application. Unlike capability plugins, these only receive data explicitly sent to them by the client:

- The **logger** receives formatted log messages and context objects.
- The **event emitter** receives structured event payloads.
- The **Transport** receives URLs, headers, and request bodies for HTTP operations.

The library wraps logger and event emitter calls in try/catch — if either throws, the exception is silently caught and does not disrupt client operations. The Transport is not wrapped this way because transport failures (network errors, authentication failures, etc.) are meaningful and must propagate to the caller.

### Risks

Malicious or poorly written extension code could:

- Inspect server capabilities, account data, or request contents passed to it
- Modify outgoing request bodies or headers (transformation plugins)
- Throw exceptions that disrupt connection or request processing (capability plugins, Transport)
- Perform arbitrary side effects (network requests, file I/O, etc.)

### Mitigation

- Only install and register extension packages from trusted sources
- Review third-party capability code before use, particularly transformation plugins that modify request data
- The library marks session data as read-only (`Readonly<>` at the type level), but this is a TypeScript compile-time check — it does not prevent runtime access in JavaScript

## Personal data

JMAP responses can contain personally identifiable information (PII). The session itself includes usernames and account names (which are often email addresses). Method responses may contain email addresses, message content, contact details, and other sensitive data depending on the capabilities in use.

This data flows through the library's extension points:

- The **logger** may receive account IDs, usernames, and error details that reference specific users.
- The **event emitter** receives payloads containing account IDs and error objects.
- The **Transport** handles the raw request and response bodies containing all JMAP data.
- **Capability plugins** receive server capabilities and account data in their plugin contexts.

The library does not persist, cache, or transmit any of this data beyond passing it to the extension points listed above. However, applications and extension code that handle this data should do so with appropriate care — consider applicable data protection requirements (e.g. GDPR, CCPA) when logging, storing, or displaying JMAP response data.

## URL templates

The JMAP session provides URI templates ([RFC 6570](https://www.rfc-editor.org/rfc/rfc6570)) for download, upload, and event source URLs. The library handles template expansion as follows:

- Parameters (account ID, blob ID, file name, content type) are validated with Zod schemas before expansion. Account IDs are verified to exist in the current session.
- Template expansion uses the `url-template` library for RFC 6570–compliant processing.
- The expanded string is parsed into a `URL` object.

Transport implementations should verify that the resulting URLs use HTTPS before making requests.

For server-side Transport implementations, treat session-provided URLs as untrusted input. Consider allowlisting expected hostnames to prevent Server-Side Request Forgery (SSRF) — a compromised or malicious session response could direct your server to make requests to internal services. As with TLS enforcement, redirects should not be followed to a different origin unless explicitly allowed.

## Dependency security

The library has a minimal runtime dependency footprint: [`zod`](https://zod.dev/) (schema validation), [`p-limit`](https://github.com/sindresorhus/p-limit) (concurrency control), [`url-template`](https://github.com/bramstein/url-template) (RFC 6570 URI template expansion), and [`@standard-schema/spec`](https://github.com/standard-schema/standard-schema) (types only). All build and test tooling is devDependencies only and not shipped to consumers.

- Run `yarn audit` regularly to check for known vulnerabilities in your dependency tree.
- Keep dependencies up to date. Pinning exact versions (via `yarn.lock`) ensures reproducible builds, but review and update periodically.
- When evaluating third-party capability packages, consider their own dependency trees — a capability with many transitive dependencies increases your supply chain attack surface.

## Rate limiting and concurrency

The library automatically enforces the server-advertised concurrency limits from the Core capability:

- **`maxConcurrentRequests`** — Limits the number of simultaneous API requests via a concurrency pool. Requests beyond the limit are queued automatically.
- **`maxConcurrentUpload`** — Limits the number of simultaneous file uploads in the same way.

These limits are read from the session during `connect()` and applied for the lifetime of the connection.

The library does **not** handle rate limiting (HTTP 429 responses) or retry logic — these are the Transport's responsibility. Transport implementations should consider:

- Respecting `Retry-After` headers in 429 responses.
- Implementing exponential backoff with jitter for retries.
- Setting a maximum retry count to avoid unbounded retry loops.

## RFC security considerations

The JMAP specifications include dedicated security considerations sections. Rather than duplicating that content here, we recommend reading:

- [RFC 8620 §8 — JMAP Core Security Considerations](https://www.rfc-editor.org/rfc/rfc8620#section-8): covers authentication, session object exposure, request size limits, denial of service, and method-level error handling.
- [RFC 8621 §9 — JMAP Mail Security Considerations](https://www.rfc-editor.org/rfc/rfc8621#section-9): covers mail-specific concerns such as HTML content in email bodies, attachment handling, and the EmailBodyPart media type.
- [RFC 7807 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807): the error response format used by JMAP request-level errors. The library stores the full Problem Details object, including any additional properties the server includes.
