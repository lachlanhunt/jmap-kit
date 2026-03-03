---
title: Developer Guide
children:
    - getting-started.md
    - session.md
    - capabilities.md
    - invocations.md
    - requests.md
    - responses.md
    - file-operations.md
    - customisation.md
    - plugins.md
    - custom-capabilities.md
    - security.md
    - troubleshooting.md
---

# jmap-kit Developer Guide

[jmap-kit](https://github.com/lachlanhunt/jmap-kit) is a typed JavaScript/TypeScript library for building [JMAP](https://jmap.io/) (JSON Meta Application Protocol) clients. It handles session management, request building, response dispatching, file operations, and a plugin system for validation and transformation — all with full type safety.

This guide covers every aspect of the library. If you are new, start with [Getting Started](getting-started.md).

## Contents

1. [Getting Started](getting-started.md) — Introduction to JMAP, installation, creating a transport and client, connecting
2. [Session](session.md) — Session data, server capabilities, accounts, staleness detection
3. [Capabilities](capabilities.md) — Capability URIs, built-in capabilities, registration, auto-inclusion
4. [Invocations](invocations.md) — Creating method calls, type-safe factories, result references
5. [Building Requests](requests.md) — Request builder, the `using` set, ID management, sending
6. [Handling Responses](responses.md) — Dispatch handlers, manual iteration, lookup by ID
7. [File Operations](file-operations.md) — Uploading, downloading, URL templates
8. [Customisation](customisation.md) — Custom transport, logger, and event emitter
9. [Plugins](plugins.md) — Validation and transformation plugin system
10. [Custom Capabilities](custom-capabilities.md) — Creating your own capability definitions, connection lifecycle
11. [Security](security.md) — Transport security, authentication, handling untrusted server data
12. [Troubleshooting](troubleshooting.md) — Diagnosing connection, request, and response errors

## API Reference

See the API Reference in the sidebar for the full generated TypeDoc documentation.
