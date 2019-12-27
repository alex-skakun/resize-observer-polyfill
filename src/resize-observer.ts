import { ResizeObserverEntry, ResizeObserverOptions } from "./interfaces";
import { resizeWatcher } from './resize-watcher';

export default class ResizeObserver {
    private readonly callback: (entries: Array<ResizeObserverEntry>) => void;

    constructor (callback: (entries: Array<ResizeObserverEntry>) => void) {
        this.callback = callback.bind(null);
    }

    observe (target: Element | SVGElement, options: ResizeObserverOptions = getDefaultOptions()): void {
        resizeWatcher.addElementToMap(target, options, this);
        resizeWatcher.start();
    }

    unobserve (target: Element | SVGElement): void {
        resizeWatcher.removeElementFromInstance(target);
    }

    disconnect (): void {
        resizeWatcher.removeInstance(this);
    }

    applyChanges (entries: Array<ResizeObserverEntry>): void {
        this.callback(entries);
    }

}

function getDefaultOptions (): ResizeObserverOptions {
    return {
        box: 'content-box'
    };
}
