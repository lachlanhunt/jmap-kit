---
title: Capability Registration
---

# Capability Registration Example

This example demonstrates how to register additional capabilities with the client so that
non‑Core invocations can be constructed and validated. It uses FastMail's Masked Email
capability, which is a vendor-specific extension.

## Prerequisites

- Node.js
- A FastMail account
- A FastMail API token with the Masked Email capability enabled

## Goals

- Register the `MaskedEmail` capability with `client.registerCapabilities(...)`
- Show how new invocation factories become available after registration
- Demonstrate a simple `MaskedEmail/get` request
- Highlight capability checks and how they affect request building

## Setup

Create a `.env` file in the repo root or export these variables in your shell:

```
JMAP_BEARER_TOKEN=your-token
JMAP_HOSTNAME=api.fastmail.com
JMAP_LOG_LEVEL=info
```

## Run

Clone the [jmap-kit](https://github.com/lachlanhunt/jmap-kit) repository, then from the repo root:

```
yarn tsx examples/capability-registration/maskedemail.ts
```

## JMAP JSON

The example builds a `MaskedEmail/get` request. Because the MaskedEmail capability is a vendor extension, the `using` array includes both the core URI and the vendor URI:

```json
{
    "using": ["urn:ietf:params:jmap:core", "https://www.fastmail.com/dev/maskedemail"],
    "methodCalls": [
        [
            "MaskedEmail/get",
            {
                "accountId": "u1234",
                "ids": null,
                "properties": ["id", "email", "state"]
            },
            "id_0"
        ]
    ]
}
```

Passing `ids: null` requests all objects of that type. The server returns a `MaskedEmail/get` response with a `list` array containing each masked email object.

## Notes

- This example focuses on _capability registration_, not deep mailbox logic.
- It will only work with FastMail accounts that have the Masked Email capability enabled for the token.
- A later example will focus on result references and advanced request building.
