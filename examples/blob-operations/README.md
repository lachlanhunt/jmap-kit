---
title: Blob Operations
---

# Blob Operations Example

This example demonstrates file upload and download using the JMAP client's blob API.

## Prerequisites

- Node.js
- A JMAP server and a bearer token

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
yarn tsx examples/blob-operations/blob-operations.ts
```

## What It Does

1. **Connects** and gets the primary account
2. **Uploads** a text blob with `client.uploadFile(accountId, blob)` and logs the response (blobId, type, size)
3. **Downloads** the blob back with `client.downloadFile(accountId, blobId, name, type)`
4. **Verifies** the round-trip content matches
5. **Inspects URLs** — shows the expanded upload and download URL templates via `client.getUploadUrl()` and `client.getDownloadUrl()`

## Key Concepts

### Upload

`client.uploadFile()` accepts a `Blob`, `ArrayBuffer`, or `File` and returns a response with `accountId`, `blobId`, `type`, and `size`:

```typescript
const blob = new Blob(["Hello!"], { type: "text/plain" });
const response = await client.uploadFile(accountId, blob);
console.log(response.blobId);
```

### Download

`client.downloadFile()` returns a `Blob` that can be read as text, an ArrayBuffer, etc.:

```typescript
const downloaded = await client.downloadFile(accountId, blobId, "file.txt", "text/plain");
const text = await downloaded.text();
```

### URL Templates

The JMAP session provides RFC 6570 URI Templates for uploads and downloads. For example, FastMail's session includes:

```
uploadUrl:   https://api.fastmail.com/jmap/upload/{accountId}/
downloadUrl: https://api.fastmail.com/jmap/download/{accountId}/{blobId}/{name}?type={type}
```

The client expands these by substituting the template variables. For example, given:

- `accountId`: `u1234abcd`
- `blobId`: `G5a3b7c9d1e2f`
- `name`: `report.txt`
- `type`: `text/plain`

The resolved URLs would be:

```
Upload:   https://api.fastmail.com/jmap/upload/u1234abcd/
Download: https://api.fastmail.com/jmap/download/u1234abcd/G5a3b7c9d1e2f/report.txt?type=text%2Fplain
```

In code:

```typescript
client.getUploadUrl(accountId); // → URL
client.getDownloadUrl(accountId, blobId, "report.txt", "text/plain"); // → URL
```

## Notes

- Upload and download are transport-level operations, not JMAP method calls. They use the session's upload/download endpoints directly and only require Core — no additional capability registration is needed.
- Blobs not referenced by any object (e.g., an email attachment) are considered orphaned and may be garbage-collected by the server at any time, though the spec guarantees at least 1 hour from upload (RFC 8620 §6).
