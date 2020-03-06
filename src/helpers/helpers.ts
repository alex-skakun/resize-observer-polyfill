export function isFunction (functionToCheck: Function): boolean {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

export function isElement (o: HTMLElement): boolean {
    return (
        typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
        o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
    );
}

export function concatValidSelector (selector: string): string {
    let validSelector = '',
        tempSelector = selector.replace('::', ':'),
        splittedSelector = tempSelector.split(':');

    splittedSelector.forEach((peace, index) => {
        if (!index) {
            validSelector += peace;
            return;
        }

        let peaceWithColon = `:${peace}`,
            previousPeace = splittedSelector[index - 1],
            isValid = /:(empty|not|last-child|last-of-type|nth-child|nth-last-child|nth-last-of-type|nth-of-type|only-of-type|only-child)/
                        .test(peaceWithColon);

        if (previousPeace && previousPeace[previousPeace.length - 1] === '(') {
            validSelector += !peaceWithColon.includes(')') ? `${peaceWithColon})` : peaceWithColon;
            return;
        }

        if (isValid) {
            validSelector += peaceWithColon;
        }
    });

    return validSelector;
}