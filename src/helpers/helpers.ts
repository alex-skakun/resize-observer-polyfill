export function isFunction (functionToCheck: Function): boolean {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

export function isElement (o: HTMLElement): boolean {
    return (
        typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
        o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
    );
}