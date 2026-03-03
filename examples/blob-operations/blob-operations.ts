import { CORE_CAPABILITY_URI } from "../../src/index.js";
import { createExampleClient } from "../utils/env.js";

/*
 * This example demonstrates file upload and download using the JMAP client's
 * blob API. It uploads a text blob, downloads it back, verifies the content
 * matches, and inspects the URL templates.
 *
 * Upload and download use the session's HTTP endpoints (RFC 8620 §6), not JMAP
 * method calls, so they work with any account that supports Core — no
 * additional capability registration is needed.
 *
 * Note: Blobs that are not referenced by any JMAP object (e.g., an email
 * attachment) are considered orphaned. The server may garbage-collect orphaned
 * blobs at any time, though the spec guarantees at least 1 hour from upload
 * before an unreferenced blob is deleted (RFC 8620 §6).
 */

const client = await createExampleClient();

const accountId = client.primaryAccounts[CORE_CAPABILITY_URI];
if (!accountId) {
    throw new Error("No primary account found.");
}

const logSection = (title: string) => {
    console.log(`\n== ${title} ==`);
};

// ---------------------------------------------------------------------------
// 1. Upload — create a Blob from a text string and upload it
// ---------------------------------------------------------------------------
logSection("1. Upload");

const content = "Hello from jmap-kit! This is a test blob uploaded via the JMAP API.";
const blob = new Blob([content], { type: "text/plain" });

console.log("Uploading blob...");
console.log("  Content length:", content.length, "bytes");
console.log("  Content type:  text/plain");

const uploadResponse = await client.uploadFile(accountId, blob);

console.log("\nUpload response:");
console.log("  accountId:", uploadResponse.accountId);
console.log("  blobId:   ", uploadResponse.blobId);
console.log("  type:     ", uploadResponse.type);
console.log("  size:     ", uploadResponse.size, "bytes");

// ---------------------------------------------------------------------------
// 2. Download — download the blob back by its blobId
// ---------------------------------------------------------------------------
logSection("2. Download");

console.log("Downloading blob...");
const downloaded = await client.downloadFile(accountId, uploadResponse.blobId, "test.txt", "text/plain");

const downloadedText = await downloaded.text();
console.log("  Downloaded size:", downloaded.size, "bytes");
console.log("  Downloaded type:", downloaded.type);
console.log("  Content:       ", downloadedText);

// ---------------------------------------------------------------------------
// 3. Verify — confirm the round-trip content matches
// ---------------------------------------------------------------------------
logSection("3. Verify");

const matches = downloadedText === content;
console.log("  Content matches:", matches);
if (!matches) {
    console.error("  WARNING: Downloaded content does not match uploaded content!");
}

// ---------------------------------------------------------------------------
// 4. URL inspection — show the expanded upload/download URL templates
// ---------------------------------------------------------------------------
logSection("4. URL inspection");

const uploadUrl = client.getUploadUrl(accountId);
console.log("Upload URL:  ", uploadUrl.toString());

const downloadUrl = client.getDownloadUrl(accountId, uploadResponse.blobId, "test.txt", "text/plain");
console.log("Download URL:", downloadUrl.toString());

await client.disconnect();
