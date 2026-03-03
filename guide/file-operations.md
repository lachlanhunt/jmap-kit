---
title: File Operations
---

# File Operations

The client provides methods for uploading and downloading binary data (blobs), as well as URL template helpers for constructing download, upload, and event source URLs.

## Uploading files

```typescript
const result = await client.uploadFile(accountId, file);

console.log(result.accountId); // the account the file was uploaded to
console.log(result.blobId); // unique identifier for the uploaded blob
console.log(result.type); // media type (from Content-Type header)
console.log(result.size); // file size in octets
```

The `file` parameter accepts a `Blob`, `ArrayBuffer`, or `File`. If the file has a `type` property (e.g. a `File` or typed `Blob`), that type is sent as the `Content-Type` header. Otherwise, `application/octet-stream` is used.

### File size validation

Before uploading, the client checks the file size against the server's `maxSizeUpload` limit from the core capabilities. If the file exceeds the limit, an error is thrown immediately without making a network request.

### Concurrency control

Uploads are subject to the server's `maxConcurrentUpload` limit. If you initiate more uploads than the server allows, excess uploads are queued and sent as earlier uploads complete. This is handled automatically.

### Cancellation

Pass an `AbortSignal` to allow the upload to be cancelled later. Call `controller.abort()` when you want to cancel:

```typescript
const controller = new AbortController();
const uploadPromise = client.uploadFile(accountId, file, controller.signal);

// Cancel the upload (e.g. user clicked a cancel button)
controller.abort();

try {
    await uploadPromise;
} catch (error) {
    // DOMException with name "AbortError"
}
```

### Error handling

Upload errors are emitted as events and then re-thrown:

- `JMAPRequestError` — emits `"upload-error"` with `{ accountId, error }`
- Other errors (network, transport) — emits `"transport-error"` with `{ error }`

## Downloading files

```typescript
const blob = await client.downloadFile(accountId, blobId, name, type);
```

| Parameter   | Type          | Description                                   |
| ----------- | ------------- | --------------------------------------------- |
| `accountId` | `Id`          | The account that owns the blob                |
| `blobId`    | `Id`          | The unique identifier for the blob            |
| `name`      | `string`      | Filename for the `Content-Disposition` header |
| `type`      | `string`      | Media type for the `Content-Type` header      |
| `signal`    | `AbortSignal` | (optional) For cancelling the request         |

Returns a `Blob` containing the file data.

### Error handling

Download errors follow the same pattern as uploads:

- `JMAPRequestError` — emits `"download-error"` with `{ accountId, blobId, error }`
- Other errors — emits `"transport-error"` with `{ error }`

## URL templates

The JMAP session provides URL templates (using [RFC 6570](https://www.rfc-editor.org/rfc/rfc6570.html) Level 1 expansion) for downloads, uploads, and event sources. The client exposes helper methods that expand these templates with validated parameters.

### Download URL

```typescript
const url = client.getDownloadUrl(accountId, blobId, name, type);
// e.g. https://api.example.com/download/abc123/blob456/report.pdf/application/pdf
```

### Upload URL

```typescript
const url = client.getUploadUrl(accountId);
// e.g. https://api.example.com/upload/abc123
```

### Event source URL

```typescript
const url = client.getEventSourceUrl(
    ["Mailbox", "Email"], // event types, or "*" for all
    "no", // "state" to close after one event, "no" to persist
    30, // ping interval in seconds (0 to disable)
);
// e.g. https://api.example.com/eventsource/?types=Mailbox,Email&closeafter=no&ping=30
```

All URL methods throw if the client is not connected or if the account ID is not found in the session.
