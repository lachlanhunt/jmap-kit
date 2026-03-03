---
title: Contributing
---

# Contributing to jmap-kit

Contributions are welcome! Whether it's a bug fix, new feature, or documentation improvement, we appreciate your help.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version, currently 22.x or later)
- [Yarn 4](https://yarnpkg.com/) (managed via Corepack)

## Setup

```bash
git clone https://github.com/lachlanhunt/jmap-kit.git
cd jmap-kit
yarn install
```

## Development Workflow

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `yarn test`          | Run tests in interactive watch mode |
| `yarn test --run`    | Run all tests once                  |
| `yarn test:coverage` | Run tests with coverage report      |
| `yarn format:check`  | Check Prettier formatting           |
| `yarn lint`          | Run ESLint                          |
| `yarn lint --fix`    | Run ESLint with auto-fix            |
| `yarn typecheck`     | Type-check without emitting files   |
| `yarn build`         | Compile TypeScript                  |

## Testing Conventions

- Tests are co-located with source files using the `.test.ts` suffix (e.g., `foo.ts` and `foo.test.ts` in the same directory).
- Use [Vitest](https://vitest.dev/) (globals are enabled, so `describe`, `it`, `expect` are available without imports).
- Use real invocation factories (e.g., `Core.request.echo(...)`, `Email.request.get(...)`) in tests. Do not mock the `Invocation` class or its subclasses.
- Type-level tests use the `.typestest.ts` suffix and verify compile-time behaviour.

## Code Conventions

- **TypeScript**: Strict mode is enabled with `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, and `noImplicitReturns`. Target ES2024.
- **Imports**: Always use `.js` extensions in relative imports (ESM requirement).
- **Spelling**: Australian English in documentation and comments. Code identifiers follow US English where defined by specs.
- **Naming**: `camelCase` for variables and functions, `PascalCase` for classes and types. Prefix unused parameters with `_`.
- **Formatting**: 120-character line width, 4-space indentation (Prettier handles formatting).
- **TSDoc**: `@see` links should reference RFCs on [rfc-editor.org](https://www.rfc-editor.org/), not jmap.io spec pages.

## Pull Request Guidelines

1. **Include tests** for any new functionality or bug fixes.
2. **All CI checks must pass**: lint, type-check, tests, and build.
3. **Follow existing patterns** in the codebase. Look at similar code for guidance.
4. **Keep changes focused**. One logical change per PR makes review easier.
5. **Update documentation** if your change affects public API behaviour or events (see the `guide/` directory).

## Reporting Issues

Please use the [GitHub issue tracker](https://github.com/lachlanhunt/jmap-kit/issues) to report bugs or request features. Use the provided issue templates when available.
