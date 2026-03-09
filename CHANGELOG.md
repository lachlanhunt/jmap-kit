# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-03-07

### Fixed

- The `EmailAddress` type incorrectly declared a `value` property instead of `email`.
- `Email/import` property `keywords` has the same `true` value requirement defined for the `Email` object.

## [1.0.2] - 2026-03-07

### Fixed

- Really fixed the undesired inclusion of the `postinstall` hook in the npm package.

## [1.0.1] - 2026-03-07

### Fixed

- Attempted to fix undesired inclusion of the `postinstall` hook in the npm package.

## [1.0.0] - 2026-03-07

### Added

- **JMAPClient**: session discovery via `.well-known/jmap`, request/response lifecycle, upload/download with concurrency control, event system.
- **Request builder**: fluent API for batching multiple invocations into a single JMAP request with automatic capability URI inclusion and ID management.
- **Result references**: chain dependent method calls within a single request without extra round trips.
- **Response dispatching**: route responses to handlers by method name, data type, or invocation ID.
- **Plugin system**: validation and transformation hooks at `pre-build`, `pre-serialization`, `post-serialization`, and `invocation` lifecycle stages.
- **Server limit enforcement**: built-in validators for `maxObjectsInGet`, `maxObjectsInSet`, `maxCallsInRequest`, `maxSizeRequest`, and read-only accounts.
- **JMAP capabilities**: Core, Email, Mailbox, Thread, Identity, SearchSnippet, EmailSubmission, VacationResponse, Blob, MaskedEmail.
- **File operations**: upload and download with server limit enforcement and automatic concurrency control.
- **Custom capabilities**: extensible architecture for defining new capabilities with their own types, invocations, validators, and transformers.
- **StandardSchema-based session validation**: server and account-level capability validation using Zod schemas.
- **Comprehensive developer guide** covering session management, capabilities, invocations, request building, response handling, file operations, customisation, and the plugin system.
