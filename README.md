# jmap-kit

[![GitHub](https://img.shields.io/badge/GitHub-jmap--kit-blue?logo=github)](https://github.com/lachlanhunt/jmap-kit)
[![npm](https://img.shields.io/npm/v/jmap-kit?logo=npm)](https://www.npmjs.com/package/jmap-kit)

A typed TypeScript library for building [JMAP](https://jmap.io/) clients. It handles session discovery, request building with type-safe invocation factories, response dispatching, file operations, and a plugin system for validation and transformation — so you can focus on your application instead of the protocol.

## Using jmap-kit

### Features

- **Session management**: automatic discovery via `.well-known/jmap`, session state tracking, staleness detection
- **Type-safe invocations**: factory functions for every JMAP method, with compile-time enforcement of argument types and property names
- **Result references**: chain dependent method calls within a single request without extra round trips
- **Request building**: combine multiple method calls into one request with automatic capability URI inclusion and ID management
- **Response dispatching**: route responses to handlers by method name, data type, or invocation ID
- **File operations**: upload and download with server limit enforcement and automatic concurrency control
- **Plugin system**: validation and transformation hooks at each stage of request processing
- **Server limit enforcement**: built-in validators for `maxObjectsInGet`, `maxObjectsInSet`, `maxCallsInRequest`, `maxSizeRequest`, and read-only accounts
- **Extensible**: define custom capabilities with their own types, invocations, validators, and transformers

### Installation

```bash
npm install jmap-kit
```

```bash
yarn add jmap-kit
```

```bash
pnpm add jmap-kit
```

### Quick Example

```typescript
import { JMAPClient, EmailCapability, Mailbox } from "jmap-kit";

const transport = /* your HTTP transport (see Developer Guide) */;
const client = new JMAPClient(transport, { hostname: "api.example.com" });
client.registerCapabilities(EmailCapability);

await client.connect();

const accountId = client.primaryAccounts["urn:ietf:params:jmap:mail"];

// Query for the Inbox, then fetch it — in a single request
const query = Mailbox.request.query({
    accountId,
    filter: { role: "inbox" },
});

const get = Mailbox.request.get({
    accountId,
    ids: query.createReference("/ids"),
    properties: ["id", "name", "role", "totalEmails", "unreadEmails"],
});

const request = client.createRequestBuilder().add(query).add(get);
const response = await request.send();

await response.methodResponses.dispatch({
    "Mailbox/get": (invocation) => {
        const mailboxes = invocation.getArgument("list");
        console.log("Inbox:", mailboxes);
    },
    error: (invocation) => {
        console.error("Error:", invocation.type);
    },
});

await client.disconnect();
```

### Documentation

See the [Developer Guide](./guide/README.md) for comprehensive documentation covering session management, capabilities, invocations, request building, response handling, file operations, customisation, the plugin system, and creating custom capabilities.

## Development

### Setup

```bash
git clone <repository-url>
cd jmap-kit
yarn install
```

### Scripts

| Command             | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| `yarn test`         | Run tests in interactive watch mode ([Vitest](https://vitest.dev/)) |
| `yarn test --run`   | Run all tests once (CI)                                             |
| `yarn format:check` | Check Prettier formatting                                           |
| `yarn lint`         | Run ESLint (`--fix` to auto-fix)                                    |
| `yarn typecheck`    | Type-check without emitting files                                   |
| `yarn build`        | Compile TypeScript                                                  |
| `yarn bundle`       | Build bundles with Rollup (for analysis, not shipped)               |
| `yarn size-check`   | Bundle and print file sizes                                         |
| `yarn docs`         | Generate API docs with TypeDoc                                      |

### Contributing

Contributions are welcome! See the [Contributing Guide](CONTRIBUTING.md) for development setup, conventions, and PR guidelines.

## License

[MIT License](LICENSE)
