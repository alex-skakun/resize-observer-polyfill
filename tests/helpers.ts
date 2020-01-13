export const wait = (time: number) => new Promise(res => setTimeout(res, time));

export const animationEnd = (element: HTMLElement, eventName: string) => {
    return new Promise(res => {
        const cb = () => {
            element.removeEventListener(eventName, cb);
            res();
        };

        element.addEventListener(eventName, cb)
    });
}