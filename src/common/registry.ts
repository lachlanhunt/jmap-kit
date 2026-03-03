// Capability URIs

/**
 * Prefix for all IETF-registered JMAP capability URIs.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-2 RFC 8620 Section 2}
 */
export const JMAP_CAPABILITY_PREFIX = "urn:ietf:params:jmap:";

/**
 * Prefix for JMAP request-level error types.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-9.4.7 Registration for JMAP Error Placeholder in JMAP Capabilities Registry - RFC 8620 Section 9.4.7}

 */
export const ERROR_CAPABILITY_PREFIX = `${JMAP_CAPABILITY_PREFIX}error:`;

/**
 * JMAP Blob management capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9404.html#section-6.1 JMAP Capability Registration for "blob" - RFC 9404 Section 6.1}
 */
export const BLOB_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}blob`;

/**
 * JMAP Core capability. This capability is always supported by all JMAP servers.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-9.4.6 Initial Registration for JMAP Core - RFC 8620 Section 9.4.6}

 */
export const CORE_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}core`;

/**
 * JMAP Mail capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621#section-10.1 JMAP Capability Registration for "mail" - RFC 8621 Section 10.1}

 */
export const EMAIL_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}mail`;

/**
 * JMAP Submission capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621#section-10.2 JMAP Capability Registration for "submission" - RFC 8621 Section 10.2}

 */
export const SUBMISSION_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}submission`;

/**
 * JMAP Vacation Response capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621#section-10.3 JMAP Capability Registration for "vacationresponse" - RFC 8621 Section 10.3}

 */
export const VACATIONRESPONSE_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}vacationresponse`;

/**
 * JMAP Message Disposition Notification (MDN) capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9007.html#section-4.1 JMAP Capability Registration for "mdn" - RFC 9007 Section 4.1}
 */
export const MDN_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}mdn`;

/**
 * JMAP S/MIME Signature Verification capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9219.html#section-5.1 JMAP Capability Registration for "smimeverify" - RFC 9219 Section 5.1}
 */
export const SMIMEVERIFY_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}smimeverify`;

/**
 * JMAP Quotas capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9425.html#section-7.1 JMAP Capability Registration for "quota" - RFC 9425 Section 7.1}
 */
export const QUOTA_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}quota`;

/**
 * JMAP WebPush VAPID capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9749.html#section-7.1 JMAP Capability Registration for VAPID - RFC 9749 Section 7.1}
 */
export const WEBPUSH_VAPID_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}webpush-vapid`;

/**
 * JMAP Calendars capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-calendars#section-10.1 JMAP Capability Registration for "calendars" - Draft IETF JMAP Calendars Section 10.1}

 */
export const CALENDARS_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}calendars`;

/**
 * JMAP Calendar event parsing capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-calendars#section-1.5.3 Draft IETF JMAP Calendars Section 1.5.3}

 */
export const CALENDARS_PARSE_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}calendars:parse`;

/**
 * JMAP Principals capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9670.html#section-7.1 JMAP Capability Registration for "principals" - RFC 9670 Section 7.1}

 */
export const PRINCIPALS_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}principals`;

/**
 * JMAP Service Provider availability capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-calendars#section-10.2 JMAP Capability Registration for "principals:availability" - Draft IETF JMAP Calendars Section 10.2}

 */
export const PRINCIPALS_AVAILABILITY_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}principals:availability`;

/**
 * JMAP Principal owner capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9670.html#section-7.2 JMAP Capability Registration for "principals:owner" - RFC 9670 Section 7.2}

 */
export const PRINCIPALS_OWNER_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}principals:owner`;

/**
 * JMAP Contacts capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9610.html#section-7.1 JMAP Capability Registration for "contacts" - RFC 9610 Section 7.1}

 */
export const CONTACTS_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}contacts`;

/**
 * JMAP Tasks capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-tasks#section-7.1 JMAP Capability Registration for "tasks" - Draft IETF JMAP Tasks Section 7.1}

 */
export const TASKS_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}tasks`;

/**
 * JMAP Tasks Recurrences capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-tasks#section-7.2 JMAP Capability Registration for "tasks:recurrences" - Draft IETF JMAP Tasks Section 7.2}

 */
export const TASKS_RECURRENCES_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}tasks:recurrences`;

/**
 * JMAP Tasks Assignees capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-tasks#section-7.3 JMAP Capability Registration for "tasks:assignees" - Draft IETF JMAP Tasks Section 7.3}

 */
export const TASKS_ASSIGNEES_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}tasks:assignees`;

/**
 * JMAP Tasks Alerts capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-tasks#section-7.4 JMAP Capability Registration for "tasks:alerts" - Draft IETF JMAP Tasks Section 7.4}

 */
export const TASKS_ALERTS_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}tasks:alerts`;

/**
 * JMAP Tasks Multilingual capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-tasks#section-7.5 JMAP Capability Registration for "tasks:multilingual" - Draft IETF JMAP Tasks Section 7.5}

 */
export const TASKS_MULTILINGUAL_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}tasks:multilingual`;

/**
 * JMAP Tasks Custom Timezones capability.
 * @see {@link https://www.iana.org/assignments/jmap/jmap.xhtml IANA JMAP Capabilities Registry}
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-tasks#section-7.6 JMAP Capability Registration for "tasks:customtimezones" - Draft IETF JMAP Tasks Section 7.6}

 */
export const TASKS_CUSTOMTIMEZONES_CAPABILITY_URI = `${JMAP_CAPABILITY_PREFIX}tasks:customtimezones`;

/**
 * FastMail Masked Email capability. This is a vendor-specific extension.
 * @see {@link https://www.fastmail.com/dev/#masked-email-api FastMail Masked Email API Documentation}
 */
export const MASKED_EMAIL_CAPABILITY_URI = `https://www.fastmail.com/dev/maskedemail`;

export type BLOB_CAPABILITY_URI = typeof BLOB_CAPABILITY_URI;
export type CORE_CAPABILITY_URI = typeof CORE_CAPABILITY_URI;
export type EMAIL_CAPABILITY_URI = typeof EMAIL_CAPABILITY_URI;
export type SUBMISSION_CAPABILITY_URI = typeof SUBMISSION_CAPABILITY_URI;
export type VACATIONRESPONSE_CAPABILITY_URI = typeof VACATIONRESPONSE_CAPABILITY_URI;
export type MDN_CAPABILITY_URI = typeof MDN_CAPABILITY_URI;
export type SMIMEVERIFY_CAPABILITY_URI = typeof SMIMEVERIFY_CAPABILITY_URI;
export type QUOTA_CAPABILITY_URI = typeof QUOTA_CAPABILITY_URI;
export type WEBPUSH_VAPID_CAPABILITY_URI = typeof WEBPUSH_VAPID_CAPABILITY_URI;
export type CALENDARS_CAPABILITY_URI = typeof CALENDARS_CAPABILITY_URI;
export type CALENDARS_PARSE_CAPABILITY_URI = typeof CALENDARS_PARSE_CAPABILITY_URI;
export type PRINCIPALS_CAPABILITY_URI = typeof PRINCIPALS_CAPABILITY_URI;
export type PRINCIPALS_AVAILABILITY_CAPABILITY_URI = typeof PRINCIPALS_AVAILABILITY_CAPABILITY_URI;
export type PRINCIPALS_OWNER_CAPABILITY_URI = typeof PRINCIPALS_OWNER_CAPABILITY_URI;
export type CONTACTS_CAPABILITY_URI = typeof CONTACTS_CAPABILITY_URI;
export type TASKS_CAPABILITY_URI = typeof TASKS_CAPABILITY_URI;
export type TASKS_RECURRENCES_CAPABILITY_URI = typeof TASKS_RECURRENCES_CAPABILITY_URI;
export type TASKS_ASSIGNEES_CAPABILITY_URI = typeof TASKS_ASSIGNEES_CAPABILITY_URI;
export type TASKS_ALERTS_CAPABILITY_URI = typeof TASKS_ALERTS_CAPABILITY_URI;
export type TASKS_MULTILINGUAL_CAPABILITY_URI = typeof TASKS_MULTILINGUAL_CAPABILITY_URI;
export type TASKS_CUSTOMTIMEZONES_CAPABILITY_URI = typeof TASKS_CUSTOMTIMEZONES_CAPABILITY_URI;
export type MASKED_EMAIL_CAPABILITY_URI = typeof MASKED_EMAIL_CAPABILITY_URI;

// Data Types

/**
 * Core data type for JMAP Core objects.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-4 The Core/Echo Method - RFC 8620 Section 4 }

 */ export const CORE_DATA_TYPE = "Core";

/**
 * Blob data type for binary data management.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-6 Binary Data - RFC 8620 Section 6}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9404.html#name-blob-methods Blob Methods - RFC 9404 Section 4}

 */
export const BLOB_DATA_TYPE = "Blob";

/**
 * PushSubscription data type for push notifications.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-7.2 PushSubscription - RFC 8620 Section 7.2}

 */
export const PUSHSUBSCRIPTION_DATA_TYPE = "PushSubscription";

/**
 * Mailbox data type for email mailbox objects.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-2 Mailboxes - RFC 8621 Section 2}

 */
export const MAILBOX_DATA_TYPE = "Mailbox";

/**
 * Thread data type for email thread objects.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-3 Threads - RFC 8621 Section 3}

 */
export const THREAD_DATA_TYPE = "Thread";

/**
 * Email data type for email message objects.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4 Emails - RFC 8621 Section 4}

 */
export const EMAIL_DATA_TYPE = "Email";

/**
 * EmailDelivery data type for push notifications. Has no methods; exists only to notify clients when new emails are added.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-1.5 Push - RFC 8621 Section 1.5}

 */
export const EMAILDELIVERY_DATA_TYPE = "EmailDelivery";

/**
 * SearchSnippet data type for email search result snippets.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-5 Search Snippets - RFC 8621 Section 5}

 */
export const SEARCHSNIPPET_DATA_TYPE = "SearchSnippet";

/**
 * Identity data type for sender identities in email submission.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-6 Identity - RFC 8621 Section 6}

 */
export const IDENTITY_DATA_TYPE = "Identity";

/**
 * EmailSubmission data type for email submission objects.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7 Email Submission - RFC 8621 Section 7}

 */
export const EMAILSUBMISSION_DATA_TYPE = "EmailSubmission";

/**
 * VacationResponse data type for vacation/out-of-office responses.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-8 Vacation Response - RFC 8621 Section 8}

 */
export const VACATIONRESPONSE_DATA_TYPE = "VacationResponse";

/**
 * MDN (Message Disposition Notification) data type.
 * @see {@link https://www.rfc-editor.org/rfc/rfc9007.html#section-2 MDN - RFC 9007 Section 2}
 */
export const MDN_DATA_TYPE = "MDN";

/**
 * Quota data type for quota management.
 * @see {@link https://www.rfc-editor.org/rfc/rfc9425.html#section-4 Quota - RFC 9425 Section 4}
 */
export const QUOTA_DATA_TYPE = "Quota";

/**
 * SieveScript data type for Sieve script management.
 * @see {@link https://www.rfc-editor.org/rfc/rfc9661.html#section-2 SieveScript - RFC 9661 Section 2}
 */
export const SIEVESCRIPT_DATA_TYPE = "SieveScript";

/**
 * Principal data type for principal objects.
 * @see {@link https://www.rfc-editor.org/rfc/rfc9670.html#section-2 Principals - RFC 9670 Section 2}

 */
export const PRINCIPAL_DATA_TYPE = "Principal";

/**
 * ShareNotification data type for share notifications.
 * @see {@link https://www.rfc-editor.org/rfc/rfc9670.html#section-3 ShareNotifications - RFC 9670 Section 3}

 */
export const SHARENOTIFICATION_DATA_TYPE = "ShareNotification";

/**
 * AddressBook data type for address book objects.
 * @see {@link https://www.rfc-editor.org/rfc/rfc9610.html#section-2 AddressBooks - RFC 9610 Section 2}

 */
export const ADDRESSBOOK_DATA_TYPE = "AddressBook";

/**
 * ContactCard data type for contact card objects.
 * @see {@link https://www.rfc-editor.org/rfc/rfc9610.html#section-3 ContactCards - RFC 9610 Section 3}

 */
export const CONTACTCARD_DATA_TYPE = "ContactCard";

/**
 * Calendar data type for calendar objects.
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-calendars#section-4 Calendars - Draft IETF JMAP Calendars Section 4}

 */
export const CALENDAR_DATA_TYPE = "Calendar";

/**
 * CalendarEvent data type for calendar event objects.
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-calendars#section-5 Calendar Events - Draft IETF JMAP Calendars Section 5}

 */
export const CALENDAREVENT_DATA_TYPE = "CalendarEvent";

/**
 * CalendarEventNotification data type for calendar event notifications.
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-calendars#section-7 Calendar Event Notifications - Draft IETF JMAP Calendars Section 7}

 */
export const CALENDAREVENTNOTIFICATION_DATA_TYPE = "CalendarEventNotification";

/**
 * ParticipantIdentity data type for participant identity objects.
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-jmap-calendars#section-3 Participant Identities - Draft IETF JMAP Calendars Section 3}

 */
export const PARTICIPANTIDENTITY_DATA_TYPE = "ParticipantIdentity";

/**
 * MaskedEmail data type for FastMail's masked email feature.
 * @see {@link https://www.fastmail.com/dev/#masked-email-api FastMail Masked Email API Documentation}
 */
export const MASKED_EMAIL_TYPE = "MaskedEmail";

export type CORE_DATA_TYPE = typeof CORE_DATA_TYPE;
export type BLOB_DATA_TYPE = typeof BLOB_DATA_TYPE;
export type PUSHSUBSCRIPTION_DATA_TYPE = typeof PUSHSUBSCRIPTION_DATA_TYPE;
export type MAILBOX_DATA_TYPE = typeof MAILBOX_DATA_TYPE;
export type THREAD_DATA_TYPE = typeof THREAD_DATA_TYPE;
export type EMAIL_DATA_TYPE = typeof EMAIL_DATA_TYPE;
export type EMAILDELIVERY_DATA_TYPE = typeof EMAILDELIVERY_DATA_TYPE;
export type SEARCHSNIPPET_DATA_TYPE = typeof SEARCHSNIPPET_DATA_TYPE;
export type IDENTITY_DATA_TYPE = typeof IDENTITY_DATA_TYPE;
export type EMAILSUBMISSION_DATA_TYPE = typeof EMAILSUBMISSION_DATA_TYPE;
export type VACATIONRESPONSE_DATA_TYPE = typeof VACATIONRESPONSE_DATA_TYPE;
export type MDN_DATA_TYPE = typeof MDN_DATA_TYPE;
export type QUOTA_DATA_TYPE = typeof QUOTA_DATA_TYPE;
export type SIEVESCRIPT_DATA_TYPE = typeof SIEVESCRIPT_DATA_TYPE;
export type PRINCIPAL_DATA_TYPE = typeof PRINCIPAL_DATA_TYPE;
export type SHARENOTIFICATION_DATA_TYPE = typeof SHARENOTIFICATION_DATA_TYPE;
export type ADDRESSBOOK_DATA_TYPE = typeof ADDRESSBOOK_DATA_TYPE;
export type CONTACTCARD_DATA_TYPE = typeof CONTACTCARD_DATA_TYPE;
export type CALENDAR_DATA_TYPE = typeof CALENDAR_DATA_TYPE;
export type CALENDAREVENT_DATA_TYPE = typeof CALENDAREVENT_DATA_TYPE;
export type CALENDAREVENTNOTIFICATION_DATA_TYPE = typeof CALENDAREVENTNOTIFICATION_DATA_TYPE;
export type PARTICIPANTIDENTITY_DATA_TYPE = typeof PARTICIPANTIDENTITY_DATA_TYPE;
export type MASKED_EMAIL_TYPE = typeof MASKED_EMAIL_TYPE;

// Request Level Errors
/**
 * The client included a capability in the "using" property of the request
 * that the server does not support.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-3.6.1 RFC 8620 Section 3.6.1 - Request-Level Errors}
 */
export const UNKNOWN_CAPABILITY = `${ERROR_CAPABILITY_PREFIX}unknownCapability`;
export type UNKNOWN_CAPABILITY = typeof UNKNOWN_CAPABILITY;

/**
 * The content type of the request was not application/json or the request
 * did not parse as I-JSON.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-3.6.1 RFC 8620 Section 3.6.1 - Request-Level Errors}
 */
export const NOT_JSON = `${ERROR_CAPABILITY_PREFIX}notJSON`;
export type NOT_JSON = typeof NOT_JSON;

/**
 * The request parsed as JSON but did not match the type signature of the Request object.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-3.6.1 RFC 8620 Section 3.6.1 - Request-Level Errors}
 */
export const NOT_REQUEST = `${ERROR_CAPABILITY_PREFIX}notRequest`;
export type NOT_REQUEST = typeof NOT_REQUEST;

/**
 * The request was rejected due to a server-defined limit.
 * A "limit" property MUST also be present on the "problem details" object,
 * containing the name of the limit being applied.
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-3.6.1 RFC 8620 Section 3.6.1 - Request-Level Errors}
 */
export const LIMIT = `${ERROR_CAPABILITY_PREFIX}limit`;
export type LIMIT = typeof LIMIT;
