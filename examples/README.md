---
title: Examples
children:
    - basic/README.md
    - capability-registration/README.md
    - invocations/README.md
    - request-builder/README.md
    - response-dispatch/README.md
    - email-operations/README.md
    - blob-operations/README.md
    - custom-capability/README.md
    - validation-plugins/README.md
---

# Examples

Runnable examples from the [jmap-kit repository](https://github.com/lachlanhunt/jmap-kit) demonstrating library features. Each example is self-contained with its own README explaining what it does and how to run it.

## Prerequisites

Most examples require a JMAP server and a bearer token. Create a `.env` file in the repo root:

```
JMAP_BEARER_TOKEN=your-token
JMAP_HOSTNAME=api.fastmail.com
JMAP_LOG_LEVEL=info
```

## Examples

1. [Basic](basic/README.md) — Connect to a JMAP server and send `Core/echo` invocations
2. [Capability Registration](capability-registration/README.md) — Register additional capabilities (e.g. FastMail Masked Email)
3. [Invocations](invocations/README.md) — Create and inspect invocations without a server connection
4. [Request Builder](request-builder/README.md) — Build multi-method requests with result references
5. [Response Dispatch](response-dispatch/README.md) — Handle responses by ID, method name, data type, or default handler
6. [Email Operations](email-operations/README.md) — List mailboxes, find the inbox, query emails
7. [Blob Operations](blob-operations/README.md) — Upload and download files via the JMAP blob API
8. [Custom Capability](custom-capability/README.md) — Write a complete custom capability from scratch
9. [Validation Plugins](validation-plugins/README.md) — Write and register custom validation plugins

## Shared Utilities

The `utils/` directory contains shared code used across examples:

- **`env.ts`** — Environment variable validation with Zod
- **`fetch-transport.ts`** — A fetch-based `Transport` implementation
- **`logger.ts`** — A coloured console logger with configurable log levels
