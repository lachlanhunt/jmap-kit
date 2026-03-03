import type {
    Id,
    Int,
    JMAPCapability,
    JMAPMethodName,
    JMAPRequestInvocation,
    JMAPRequestInvocationArgs,
    JMAPResultReference,
    JSONValue,
    RequireSome,
    UnsignedInt,
} from "../common/types.js";
import type { Invocation } from "./invocation.js";
import type { ResultReference } from "./result-reference.js";

/**
 * The interface for Invocation instances.
 *
 * @typeParam T - The invocation arguments interface for the `{Object}/{method}` invocation being created
 */
export interface InvocationInterface<TArgs extends BaseInvocationArgs> {
    readonly name: string;
    readonly uri: JMAPCapability;

    getArgument(name: keyof TArgs & string): JSONValue | ResultReference | undefined;
    setArgument<K extends keyof TArgs & string>(name: K, value: InvocationArgs<TArgs>[K]): void;
    deleteArgument(name: keyof TArgs & string): boolean;
    hasArgument(name: keyof TArgs & string): boolean;

    resolve(id: string, lookupId: (id: symbol) => string | undefined): JMAPRequestInvocation;
    createReference(path: string): ResultReference;
    toJSON(): JMAPInvocationInternal;
}

export type InvocationFactory<TArgs extends BaseInvocationArgs, TInvocation extends Invocation<TArgs>> = (
    args: InvocationArgs<TArgs>,
    methodCallId?: symbol,
) => TInvocation;

/** A generic invocation factory type that can be used for any `{Object}/{method}` invocation. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericInvocationFactory = (args: any, methodCallId?: symbol) => Invocation<BaseInvocationArgs>;

/** A mapping of method names to their corresponding invocation factory functions. */
export type InvocationFactoryMethods = Partial<Record<JMAPMethodName, GenericInvocationFactory>>;

/** A collection of invocation factory functions for both request and response invocations.*/
export type InvocationFactoryCollection = {
    request: InvocationFactoryMethods;
    response: InvocationFactoryMethods;
};

/** The interface for Result Reference objects created by Invocations */
export interface ResultReferenceInterface {
    readonly name: string;
    readonly path: string;

    toJSON(): JMAPResultReferenceInternal;
}

/**
 * An unordered set of patches. The keys are a path in JSON Pointer Format
 * {@link https://www.rfc-editor.org/rfc/rfc6901.html RFC 6901}, with an implicit leading “`/`”
 * (i.e., prefix each key with “`/`” before applying the JSON Pointer evaluation algorithm).
 */
export type PatchObject = Record<string, JSONValue>;

/**
 * An object whose allowed properties and semantics depend on the data type
 * and is defined in the `/query` method specification for that type.
 * It MUST NOT have an operator property.
 *
 * @typeParam T - The filter condition object for the `{Object}/query` or `/queryChanges` invocation
 */
export type FilterCondition<T extends BaseFilterCondition> = T;

/**
 * An object used to combine multiple conditions with boolean operators.
 *
 * @typeParam T - The filter condition object for the `{Object}/query` or `/queryChanges` invocation
 */
export type FilterOperator<T extends BaseFilterCondition> = {
    /**
     * This MUST be one of the following strings:
     * - AND: All of the conditions must match for the filter to match.
     * - OR: At least one of the conditions must match for the filter to match.
     * - NOT: None of the conditions must match for the filter to match.
     */
    operator: "AND" | "OR" | "NOT";

    /**
     *The conditions to evaluate against each record.
     */
    conditions: (FilterOperator<T> | FilterCondition<T>)[];
};

/**
 * An object used to specify the sorting order for `/query` and `/queryChanges` calls.
 *
 * @typeParam T - The interface of the object whose properties are being compared for sorting
 */
export type Comparator<TObj extends BaseObject> = {
    /**
     * The name of the property on the Foo objects to compare.
     */
    property: keyof TObj;

    /**
     * (default: true) If true, sort in ascending order. If false, reverse the comparator’s results
     * to sort in descending order.
     */
    isAscending?: boolean;

    /**
     * (default is server dependent) The identifier, as registered in the collation registry
     * defined in {@link https://www.rfc-editor.org/rfc/rfc4790.html RFC 4790}, for the algorithm
     * to use when comparing the order of strings. The algorithms the server supports are
     * advertised in the capabilities object returned with the Session object.
     */
    collation?: string;
};

/**
 * Allows ResultReference values on all properties and disallow explicit property names starting with `#`
 *
 * @typeParam T - The invocation arguments interface for the given `{Object}/{method}` invocation
 * being created.
 * */
export type InvocationArgs<TArgs extends BaseInvocationArgs> = {
    [K in keyof TArgs]: TArgs[K] | ResultReference;
} & Record<`#${string}`, never>;

/**
 * Internal interface allowing Symbol values on `resultOf` properties.
 * Used for `ResultReference.prototype.toJSON`.
 *
 * @remarks
 * Any symbol values should be replaced by a `JSON.stringify` `replacer` function.
 */
export interface JMAPResultReferenceInternal extends Omit<JMAPResultReference, "resultOf"> {
    resultOf: symbol;
}

/**
 * Internal interface allowing ResultReference values on all properties,
 * and JMAPResultReference values on property names starting with `#`.
 * Used for `Invocation.prototype.toJSON` (via JMAPInvocationInternal)
 *
 * @remarks
 * Any properties with ResultReference values should be have their name prefixed
 * with `#` and be replaced with a JMAPResultReference object by a `JSON.stringify`
 * `replacer` function.
 */
export interface JMAPInvocationArgsInternal extends Omit<InvocationArgs<JMAPRequestInvocationArgs>, "ref"> {
    [ref: `#${string}`]: Omit<JSONValue & JMAPResultReference, "member"> | ResultReference;
}

/**
 * Internal interface for Invocation.prototype.toJSON
 *
 * @remarks
 * Any symbol values should be replaced by a `JSON.stringify` `replacer` function.
 */
export type JMAPInvocationInternal = [name: string, arguments: JMAPInvocationArgsInternal, methodCallId: symbol];

/**
 * Generic JMAP object
 */
export type BaseObject = Record<string, JSONValue>;

/**
 * Generic Filter Conditon
 */
export type BaseFilterCondition = Record<string, JSONValue>;

/**
 * Generic Invocation arguments
 */
export type BaseInvocationArgs = Record<string, JSONValue>;

/**
 * The standard arguments for fetching objects via a `/get` call
 *
 * @typeParam T - The interface of the object whose properties are being fetched
 */
export type BaseGetRequestInvocationArgs<TObj extends BaseObject> = {
    /**
     * The id of the account to use. The value must be an `Id`
     */
    accountId: Id;

    /**
     * The ids of the objects to return. If null, then all records of the data type are
     * returned, if this is supported for that data type and the number of records does
     * not exceed the maxObjectsInGet limit.
     *
     * The value must be `Id[] | null`
     *
     */
    ids?: Id[] | null;

    /**
     * If supplied, only the properties listed in the array are returned for each object.
     * If null, all properties of the object are returned. The id property of the object
     * is always returned, even if not explicitly requested. If an invalid property is
     * requested, the call MUST be rejected with an invalidArguments error.
     */
    properties?: (keyof TObj)[] | null;
};

export type BaseGetResponseInvocationArgs<TObj extends BaseObject> = {
    /**
     * The id of the account used for the call.
     */
    accountId: Id;

    /**
     * A (preferably short) string representing the state on the server for all the data of this
     * type in the account (not just the objects returned in this call). If the data changes, this
     * string MUST change. If the Foo data is unchanged, servers SHOULD return the same state string
     * on subsequent requests for this data type.
     *
     * When a client receives a response with a different state string to a previous call, it MUST
     * either throw away all currently cached objects for the type or call Foo/changes to get the
     * exact changes.
     */
    state: string;

    /**
     * An array of the Foo objects requested. This is the empty array if no objects were found or if
     * the ids argument passed in was also an empty array. The results MAY be in a different order
     * to the ids in the request arguments. If an identical id is included more than once in the
     * request, the server MUST only include it once in either the list or the notFound argument of
     * the response.
     */
    list: TObj[];

    /**
     * This array contains the ids passed to the method for records that do not exist. The array is
     * empty if all requested ids were found or if the ids argument passed in was either null or an
     * empty array.
     */
    notFound: Id[];
};

/**
 * The standard arguments for fetching changes via a `/changes` call
 */
export type BaseChangesRequestInvocationArgs = {
    /**
     * The id of the account to use. The value must be an `Id`
     */
    accountId: Id;

    /**
     * The current state of the client. This is the string that was returned as
     * the state argument in a `/get` response.
     */
    sinceState: string;

    /**
     * The maximum number of ids to return in the response.
     *
     * The value must be `UnsignedInt | null`
     */
    maxChanges?: UnsignedInt | null;
};

export type BaseChangesResponseInvocationArgs = {
    /**
     * The id of the account used for the call.
     */
    accountId: Id;

    /**
     * This is the sinceState argument echoed back; it’s the state from which the server is
     * returning changes.
     */
    oldState: string;

    /**
     * This is the state the client will be in after applying the set of changes to the old state.
     */
    newState: string;

    /**
     * If true, the client may call Foo/changes again with the newState returned to get further
     * updates. If false, newState is the current server state.
     */
    hasMoreChanges: boolean;

    /**
     * An array of ids for records that have been created since the old state.
     */
    created: Id[];

    /**
     * An array of ids for records that have been updated since the old state.
     */
    updated: Id[];

    /**
     * An array of ids for records that have been destroyed since the old state.
     */
    destroyed: Id[];
};

/**
 * The standard arguments for querying objects via a `/query` call
 */
export type BaseQueryRequestInvocationArgs<TObj extends BaseObject, F extends BaseFilterCondition> = {
    /**
     * The id of the account to use.
     */
    accountId: Id;

    /**
     * Determines the set of Foos returned in the results. If null, all objects
     * in the account of this type are included in the results.
     */
    filter?: FilterOperator<F> | FilterCondition<F> | null;

    /**
     * Lists the names of properties to compare between two records,
     * and how to compare them, to determine which comes first in the sort.
     * If two Foo records have an identical value for the first comparator,
     * the next comparator will be considered, and so on. If all comparators
     * are the same (this includes the case where an empty array or `null` is
     * given as the sort argument), the sort order is server dependent, but
     * it MUST be stable between calls to `/query`.
     */
    sort?: Comparator<TObj>[] | null;

    /**
     * (default: 0) The zero-based index of the first id in
     * the full list of results to return.
     */
    position?: Int;

    /**
     * An object id. If supplied, the position argument is ignored.
     * The index of this id in the results will be used in combination with
     * the anchorOffset argument to determine the index of the first result
     * to return.
     */
    anchor?: Id | null;

    /**
     * (default: 0) The index of the first result to return relative to the
     * index of the anchor, if an anchor is given. This MAY be negative.
     */
    anchorOffset?: Int;

    /**
     * The maximum number of results to return. If null, no limit presumed.
     */
    limit?: UnsignedInt | null;

    /**
     * (default: false) Does the client wish to know the total number of results
     * in the query? This may be slow and expensive for servers to calculate,
     * particularly with complex filters, so clients should take care to only
     * request the total when needed.
     */
    calculateTotal?: boolean;
};

export type BaseQueryResponseInvocationArgs = {
    /**
     * The id of the account used for the call.
     */
    accountId: Id;

    /**
     * A string encoding the current state of the query on the server. This string MUST change if
     * the results of the query (i.e., the matching ids and their sort order) have changed. The
     * queryState string MAY change if something has changed on the server, which means the results
     * may have changed but the server doesn’t know for sure.
     *
     * The queryState string only represents the ordered list of ids that match the particular
     * query (including its sort/filter). There is no requirement for it to change if a property on
     * an object matching the query changes but the query results are unaffected (indeed, it is more
     * efficient if the queryState string does not change in this case). The queryState string only
     * has meaning when compared to future responses to a query with the same type/sort/filter or
     * when used with /queryChanges to fetch changes.
     *
     * Should a client receive back a response with a different queryState string to a previous
     * call, it MUST either throw away the currently cached query and fetch it again (note, this
     * does not require fetching the records again, just the list of ids) or call Foo/queryChanges
     * to get the difference.
     */
    queryState: string;

    /**
     * This is true if the server supports calling Foo/queryChanges with these filter/sort
     * parameters. Note, this does not guarantee that the Foo/queryChanges call will succeed, as it
     * may only be possible for a limited time afterwards due to server internal implementation
     * details.
     */
    canCalculateChanges: boolean;

    /**
     * The zero-based index of the first result in the `ids` array within the complete list of
     * query results.  If the `ids` array is empty, the value is undefined and MUST NOT be used
     * by the client.
     */
    position: UnsignedInt;

    /**
     * The list of ids for each Foo in the query results, starting at the index given by the
     * position argument of this response and continuing until it hits the end of the results or
     * reaches the limit number of ids. If position is >= total, this MUST be the empty list.
     */
    ids: Id[];

    /**
     * (only if requested) The total number of Foos in the results (given the filter). This
     * argument MUST be omitted if the calculateTotal request argument is not true.
     */
    total: UnsignedInt;

    /**
     * (if set by the server) The limit enforced by the server on the maximum number of results to
     * return. This is only returned if the server set a limit or used a different limit than that
     * given in the request.
     */
    limit: UnsignedInt;
};

/**
 * The standard arguments for querying changes to objects via a `/queryChanges` call
 */
export type BaseQueryChangesRequestInvocationArgs<TObj extends BaseObject, F extends BaseFilterCondition> = {
    /**
     * The id of the account to use.
     */
    accountId: Id;

    /**
     * The filter argument that was used with Foo/query.
     */
    filter?: FilterOperator<F> | FilterCondition<F> | null;

    /**
     * The sort argument that was used with Foo/query.
     */
    sort?: Comparator<TObj>[] | null;

    /**
     * The current state of the query in the client. This is the string that was
     * returned as the queryState argument in the Foo/query response with the same
     * sort/filter. The server will return the changes made to the query since this state.
     */
    sinceQueryState: string;

    /**
     * The maximum number of changes to return in the response.
     */
    maxChanges?: UnsignedInt | null;

    /**
     * The last (highest-index) id the client currently has cached from the query results.
     * When there are a large number of results, in a common case, the client may have only
     * downloaded and cached a small subset from the beginning of the results.  The server may
     * be able to omit added or removed items that are after the client's last cached id, which
     * can significantly increase efficiency.
     */
    upToId?: Id | null;

    /**
     * (default: false) Does the client wish to know the total number of results now in the query?
     * This may be slow and expensive for servers to calculate, particularly with complex filters,
     * so clients should take care to only request the total when needed.
     */
    calculateTotal?: boolean;
};

export type BaseQueryChangesResponseInvocationArgs = {
    /**
     * The id of the account used for the call.
     */
    accountId: Id;

    /**
     * This is the sinceQueryState argument echoed back; that is, the state from which the server is
     * returning changes.
     */
    oldQueryState: string;

    /**
     * This is the state the query will be in after applying the set of changes to the old state.
     */
    newQueryState: string;

    /**
     * (only if requested) The total number of Foos in the results (given the filter). This argument
     * MUST be omitted if the calculateTotal request argument is not true.
     */
    total: UnsignedInt;

    /**
     * The `id` for every Foo that was in the query results in the old state and that is not in the
     * results in the new state.
     *
     * If the server cannot calculate this exactly, the server MAY return the ids of extra Foos in
     * addition that may have been in the old results but are not in the new results.
     *
     * If an `upToId` is supplied and existed in the old results, any ids that were removed but had
     * a higher index than `upToId` in those results SHOULD be omitted.  If the server cannot
     * calculate this, the `upToId` MUST be ignored.
     *
     * If the `filter` or `sort` includes a mutable property, the server MUST include all Foos in the
     * current results for which this property may have changed.  The position of these may have moved
     * in the results, so they must be reinserted by the client to ensure its query cache is correct.
     */
    removed: Id[];

    /**
     * The id and index in the query results (in the new state) for every Foo that has been added to
     * the results since the old state AND every Foo in the current results that was included in the
     * `removed` array (due to a filter or sort based upon a mutable property).
     *
     * If an `upToId` is supplied and exists in the new results, any ids that were added but have a
     * higher index than `upToId` SHOULD be omitted.
     *
     * The array MUST be sorted in order of index, with the lowest index first.
     */
    added: AddedItem[];
};

/**
 * An item Id and its index used for the added items array in a `/queryChanges` response.
 */
export type AddedItem = {
    id: Id;
    index: UnsignedInt;
};

/**
 * The standard arguments to copy or move objects between two different accounts via a `/copy` call
 *
 * @typeParam T - The interface of the object specifying invocation arguments for the `create` object.
 * @typeParam RequiredKeys - A union of keys (keyof T) that are required for the `create` object. `id` is always required, even if not specified.
 */
export type BaseCopyRequestInvocationArgs<TObj extends BaseObject, RequiredKeys extends keyof TObj = "id"> = {
    /**
     * The id of the account to copy records from.
     */
    fromAccountId: Id;

    /**
     * This is a state string as returned by the `/get` method.
     */
    ifFromInState?: string | null;

    /**
     * The id of the account to copy records to.
     */
    accountId: Id;

    /**
     * This is a state string as returned by the `/get` method.
     */
    ifInState?: string | null;

    /**
     *  A map of the creation id to an object.
     */
    create: Record<Id, RequireSome<TObj, "id" | RequiredKeys>>;

    /**
     * (default: false) If true, an attempt will be made to destroy the original
     * records that were successfully copied.
     */
    onSuccessDestroyOriginal?: boolean;

    /**
     * This argument is passed on as the ifInState argument to the implicit Foo/set call, if made at the end of this request to destroy the originals that were successfully copied.
     */
    destroyFromIfInState?: string | null;
};

/** */
export type BaseCopyResponseInvocationArgs<TObj extends BaseObject> = {
    /**
     * The id of the account records were copied from.
     */
    fromAccountId: Id;

    /**
     * The id of the account records were copied to.
     */
    accountId: Id;

    /**
     * The state string that would have been returned by Foo/get on the account records that were
     * copied to before making the requested changes, or null if the server doesn’t know what the
     * previous state string was.
     */
    oldState?: string | null;

    /**
     * The state string that will now be returned by Foo/get on the account records were copied to.
     */
    newState: string;

    /**
     * A map of the creation id to an object containing any properties of the copied Foo object that
     * are set by the server (such as the id in most object types; note, the id is likely to be
     * different to the id of the object in the account it was copied from).
     *
     * This argument is null if no Foo objects were successfully copied.
     */
    created?: Record<Id, TObj> | null;

    /**
     * A map of the creation id to a SetError object for each record that failed to be copied, or
     * null if none.
     */
    notCreated?: Record<
        Id,
        SetError<
            "create" | "update",
            never,
            {
                type: "alreadyExists";
                existingId: Id;
            }
        >
    > | null;
};

/**
 * The categories of SetError types
 */
export type SetErrorCategory = "create" | "update" | "destroy";

/**
 * The allowed SetError type values as per JMAP spec.
 *
 * Note: This type is for documentation and code completion only. Use `string` for the SetError.type property to avoid TypeScript override errors.
 */
export type SetErrorType<TCategory extends SetErrorCategory = SetErrorCategory> =
    | "forbidden"
    | (TCategory extends "destroy" ? never : "overQuota" | "tooLarge")
    | (TCategory extends "create" ? "rateLimit" : "notFound")
    | (TCategory extends "update" ? "invalidPatch" | "willDestroy" : "singleton");

export type SetError<
    TCategory extends SetErrorCategory = SetErrorCategory,
    TAdditionalType extends string = never,
    TAdditionalObj extends Record<string, JSONValue> = never,
> = {
    /**
     * A description of the error to help with debugging that includes an explanation of what the problem was. This is a non-localised string and is not intended to be shown directly to end users.
     */
    description?: string | null;
} & (
    | {
          /**
           * The type of error. See JMAP spec for allowed values (e.g. forbidden, overQuota, tooLarge, rateLimit, notFound, invalidPatch, willDestroy, invalidProperties, singleton, etc.)
           */
          type: SetErrorType<TCategory> | TAdditionalType;
      }
    | (TCategory extends "destroy"
          ? never
          : {
                type: "invalidProperties";
                /**
                 * (invalidProperties only) The properties that were invalid, if applicable.
                 */
                properties?: string[];
            })
    | TAdditionalObj
);

/**
 * The standard arguments for creating, updating, and destroying objects via a `/set` call
 *
 * @typeParam T - The interface of the object specifying invocation arguments for the `create`
 * object.
 */
export type BaseSetRequestInvocationArgs<TObj extends BaseObject> = {
    /**
     * The id of the account to use. The value must be an `Id`
     */
    accountId: Id;

    /**
     * This is a state string as returned by the `/get` method
     * (representing the state of all objects of this type in the account).
     */
    ifInState?: string | null;

    /**
     * A map of a creation id (a temporary id set by the client) to Foo objects,
     * or `null` if no objects are to be created.
     */
    create?: Record<Id, TObj> | null;

    /**
     * A map of an id to a Patch object to apply to the current object with that id,
     * or `null` if no objects are to be updated.
     */
    update?: Record<Id, PatchObject> | null;

    /**
     * A list of ids for objects to permanently delete, or null if no objects
     * are to be destroyed.
     */
    destroy?: Id[] | null;
};

export type BaseSetResponseInvocationArgs<TObj extends BaseObject> = {
    /** The id of the account used for the call. */
    accountId: Id;

    /**
     * The state string that would have been returned by Foo/get before making the requested
     * changes, or null if the server doesn’t know what the previous state string was.
     */
    oldState?: string | null;

    /**
     * The state string that will now be returned by Foo/get.
     */
    newState: string;

    /**
     * A map of the creation id to an object containing any properties of the created Foo object
     * that were not sent by the client. This includes all server-set properties (such as the id in
     * most object types) and any properties that were omitted by the client and thus set to a
     * default by the server.
     *
     * This argument is null if no Foo objects were successfully created.
     */
    created?: Record<Id, TObj> | null;

    /**
     * The keys in this map are the ids of all Foos that were successfully updated.
     *
     * The value for each id is a Foo object containing any property that changed in a way not
     * explicitly requested by the PatchObject sent to the server, or null if none. This lets the
     * client know of any changes to server-set or computed properties.
     *
     * This argument is null if no Foo objects were successfully updated.
     */
    updated?: Record<Id, TObj | null> | null;

    /**
     * A list of Foo ids for records that were successfully destroyed, or null if none.
     */
    destroyed?: Id[] | null;

    /**
     * A map of the creation id to a SetError object for each record that failed to be created, or
     * null if all successful.
     */
    notCreated?: Record<Id, SetError<"create">> | null;

    /**
     * A map of the Foo id to a SetError object for each record that failed to be updated, or null
     * if all successful.
     */
    notUpdated?: Record<Id, SetError<"update">> | null;

    /**
     * A map of the Foo id to a SetError object for each record that failed to be destroyed, or null
     * if all successful.
     */
    notDestroyed?: Record<Id, SetError<"destroy">> | null;
};
