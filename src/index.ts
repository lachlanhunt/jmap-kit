// Classes
export { ErrorInvocation } from "./invocation/error-invocation.js";
export { Invocation } from "./invocation/invocation.js";
export { ResultReference } from "./invocation/result-reference.js";
export { JMAPClient } from "./jmap-client/jmap-client.js";
export { RequestBuilder } from "./request-builder/request-builder.js";

// Type guards
export { isErrorInvocation, isResultReference } from "./invocation/utils.js";

// Error handling
export { JMAPRequestError } from "./jmap-client/utils/jmap-request-error.js";

// Capability definitions
export { BlobCapability } from "./capabilities/blob-capability.js";
export { CoreCapability } from "./capabilities/core-capability.js";
export { EmailCapability } from "./capabilities/email-capability.js";
export { MaskedEmailCapability } from "./capabilities/maskedemail-capability.js";
export { SubmissionCapability } from "./capabilities/submission-capability.js";
export { VacationResponseCapability } from "./capabilities/vacationresponse-capability.js";

// Invocation factories
export { Blob } from "./capabilities/blob/blob.js";
export { Core } from "./capabilities/core/core.js";
export { Email } from "./capabilities/email/email.js";
export { EmailSubmission } from "./capabilities/emailsubmission/emailsubmission.js";
export { Identity } from "./capabilities/identity/identity.js";
export { Mailbox } from "./capabilities/mailbox/mailbox.js";
export { MaskedEmail } from "./capabilities/maskedemail/maskedemail.js";
export { SearchSnippet } from "./capabilities/searchsnippet/searchsnippet.js";
export { Thread } from "./capabilities/thread/thread.js";
export { VacationResponse } from "./capabilities/vacationresponse/vacationresponse.js";

// Common types and capability URI constants
export * from "./common/registry.js";
export type * from "./common/types.js";

// JMAPClient types
export type {
    CapabilityRegistrationResult,
    ClientContext,
    ConnectionStatus,
    EventEmitterFn,
    JMAPAccount,
    JMAPClientEventName,
    JMAPClientEvents,
    JMAPClientInterface,
    JMAPClientOptions,
    JMAPSession,
    JMAPUploadResponse,
    Logger,
    LoggerMethod,
    Transport,
    TransportRequestOptions,
    TransportResponseType,
    TypedEventEmitterFn,
} from "./jmap-client/types.js";

// Invocation types
export type {
    AddedItem,
    BaseChangesRequestInvocationArgs,
    BaseChangesResponseInvocationArgs,
    BaseCopyRequestInvocationArgs,
    BaseCopyResponseInvocationArgs,
    BaseFilterCondition,
    BaseGetRequestInvocationArgs,
    BaseGetResponseInvocationArgs,
    BaseInvocationArgs,
    BaseObject,
    BaseQueryChangesRequestInvocationArgs,
    BaseQueryChangesResponseInvocationArgs,
    BaseQueryRequestInvocationArgs,
    BaseQueryResponseInvocationArgs,
    BaseSetRequestInvocationArgs,
    BaseSetResponseInvocationArgs,
    Comparator,
    FilterCondition,
    FilterOperator,
    GenericInvocationFactory,
    InvocationArgs,
    InvocationFactory,
    InvocationFactoryCollection,
    InvocationFactoryMethods,
    InvocationInterface,
    PatchObject,
    ResultReferenceInterface,
    SetError,
    SetErrorCategory,
    SetErrorType,
} from "./invocation/types.js";

// Capability registry types
export type {
    AccountCapabilityValidationResult,
    BasePluginContext,
    CapabilityDefinition,
    CapabilityRegistryInterface,
    InvocationFactoryMap,
    PluginContext,
    PluginData,
    PluginLifecycleHook,
    PluginTrigger,
    ServerCapabilityValidationResult,
    TransformationPlugin,
    TransformationPluginMap,
    TransformerExecutionContext,
    ValidationPlugin,
    ValidationPluginContext,
    ValidationPluginLifecycleHook,
    ValidationPluginMap,
    ValidationPluginTrigger,
    ValidationResult,
    ValidatorExecutionContext,
} from "./capability-registry/types.js";

// Invocation factory types (response dispatch)
export type { HandlerFn, InvocationHandlerMap } from "./invocation-factory/types.js";

// Core types
export type {
    CoreEchoRequestInvocationArgs,
    CoreEchoResponseInvocationArgs,
    CoreInvocationArgs,
} from "./capabilities/core/types.js";

// Email types
export type {
    EmailAddress,
    EmailAddressGroup,
    EmailBodyPart,
    EmailBodyValue,
    EmailChangesRequestInvocationArgs,
    EmailChangesResponseInvocationArgs,
    EmailCopyRequestInvocationArgs,
    EmailCopyResponseInvocationArgs,
    EmailFilterCondition,
    EmailGetRequestInvocationArgs,
    EmailGetResponseInvocationArgs,
    EmailHeader,
    EmailImport,
    EmailImportRequestInvocationArgs,
    EmailImportResponseInvocationArgs,
    EmailObject,
    EmailObjectServerSet,
    EmailObjectSettable,
    EmailParseRequestInvocationArgs,
    EmailParseResponseInvocationArgs,
    EmailQueryChangesRequestInvocationArgs,
    EmailQueryChangesResponseInvocationArgs,
    EmailQueryRequestInvocationArgs,
    EmailQueryResponseInvocationArgs,
    EmailSetRequestInvocationArgs,
    EmailSetResponseInvocationArgs,
    JMAPKeywords,
} from "./capabilities/email/types.js";

// Mailbox types
export type {
    MailboxChangesRequestInvocationArgs,
    MailboxChangesResponseInvocationArgs,
    MailboxFilterCondition,
    MailboxGetRequestInvocationArgs,
    MailboxGetResponseInvocationArgs,
    MailboxObject,
    MailboxObjectServerSet,
    MailboxObjectSettable,
    MailboxQueryChangesRequestInvocationArgs,
    MailboxQueryChangesResponseInvocationArgs,
    MailboxQueryRequestInvocationArgs,
    MailboxQueryResponseInvocationArgs,
    MailboxRights,
    MailboxSetRequestInvocationArgs,
    MailboxSetResponseInvocationArgs,
} from "./capabilities/mailbox/types.js";

// Thread types
export type {
    ThreadChangesRequestInvocationArgs,
    ThreadChangesResponseInvocationArgs,
    ThreadGetRequestInvocationArgs,
    ThreadGetResponseInvocationArgs,
    ThreadObject,
    ThreadObjectServerSet,
} from "./capabilities/thread/types.js";

// Identity types
export type {
    IdentityChangesRequestInvocationArgs,
    IdentityChangesResponseInvocationArgs,
    IdentityGetRequestInvocationArgs,
    IdentityGetResponseInvocationArgs,
    IdentityObject,
    IdentityObjectServerSet,
    IdentityObjectSettable,
    IdentitySetRequestInvocationArgs,
    IdentitySetResponseInvocationArgs,
} from "./capabilities/identity/types.js";

// Blob types
export { HTTPDigestAlgorithmSchema as HTTPDigestAlgorithmValueSchema } from "./capabilities/blob/types.js";
export type {
    BlobCopyRequestInvocationArgs,
    BlobCopyResponseInvocationArgs,
    BlobDataFormat,
    BlobGetRequestInvocationArgs,
    BlobGetResponseInvocationArgs,
    BlobInfo,
    BlobLookupRequestInvocationArgs,
    BlobLookupResponseInvocationArgs,
    BlobObject,
    BlobObjectData,
    BlobObjectDigest,
    BlobObjectSize,
    BlobUploadRequestInvocationArgs,
    BlobUploadResponseInvocationArgs,
    DataCreatedObject,
    DataSourceObject,
    HTTPDigestAlgorithm,
    UploadObject,
} from "./capabilities/blob/types.js";

// EmailSubmission types
export type {
    DeliveryStatus,
    EmailSubmissionAddress,
    EmailSubmissionChangesRequestInvocationArgs,
    EmailSubmissionChangesResponseInvocationArgs,
    EmailSubmissionEnvelope,
    EmailSubmissionFilterCondition,
    EmailSubmissionGetRequestInvocationArgs,
    EmailSubmissionGetResponseInvocationArgs,
    EmailSubmissionObject,
    EmailSubmissionObjectServerSet,
    EmailSubmissionObjectSettable,
    EmailSubmissionQueryChangesRequestInvocationArgs,
    EmailSubmissionQueryChangesResponseInvocationArgs,
    EmailSubmissionQueryRequestInvocationArgs,
    EmailSubmissionQueryResponseInvocationArgs,
    EmailSubmissionSetRequestInvocationArgs,
    EmailSubmissionSetResponseInvocationArgs,
} from "./capabilities/emailsubmission/types.js";

// VacationResponse types
export type {
    VacationResponseGetRequestInvocationArgs,
    VacationResponseGetResponseInvocationArgs,
    VacationResponseObject,
    VacationResponseObjectServerSet,
    VacationResponseObjectSettable,
    VacationResponseSetRequestInvocationArgs,
    VacationResponseSetResponseInvocationArgs,
} from "./capabilities/vacationresponse/types.js";

// MaskedEmail types
export type {
    MaskedEmailGetRequestInvocationArgs,
    MaskedEmailGetResponseInvocationArgs,
    MaskedEmailObject,
    MaskedEmailObjectServerSet,
    MaskedEmailObjectSettable,
    MaskedEmailSetRequestInvocationArgs,
    MaskedEmailSetResponseInvocationArgs,
    MaskedEmailState,
} from "./capabilities/maskedemail/types.js";

// SearchSnippet types
export type {
    SearchSnippetGetRequestInvocationArgs,
    SearchSnippetGetResponseInvocationArgs,
    SearchSnippetObject,
} from "./capabilities/searchsnippet/types.js";
