export function isWritable(obj: object, key: string | number | symbol): boolean {
    const descriptor = Reflect.getOwnPropertyDescriptor(obj, key);
    const proto = Reflect.getPrototypeOf(obj);

    if (!descriptor && proto) {
        return isWritable(proto, key);
    }

    return descriptor?.writable ?? descriptor?.set !== undefined;
}
