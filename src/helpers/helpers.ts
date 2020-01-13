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
        let peaceWithColon = index ? `:${peace}` : peace,
            previousPeace = splittedSelector[index - 1];
        if (
            !(
                /:(after|before|first-letter|first-line|hover|focus|checked|disabled|active|empty|enabled|valid|in-valid)/
                .test(peaceWithColon)
            )
        ) {
            validSelector += peaceWithColon;
        }

        if (previousPeace && previousPeace[previousPeace.length - 1] === '(') {
            validSelector += peaceWithColon[peaceWithColon.length - 1] !== ')' ? `${peaceWithColon})` : peaceWithColon;
        }
    });

    return validSelector;
}