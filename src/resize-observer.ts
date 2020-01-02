import { ResizeObserverEntry, ResizeObserverOptions } from "./interfaces";
import { ResizeWatcher } from './resize-watcher';

export default class ResizeObserver {
    private readonly callback: (entries: Array<ResizeObserverEntry>) => void;
    private resizeWatcher: ResizeWatcher;

    constructor (callback: (entries: Array<ResizeObserverEntry>) => void) {
        this.resizeWatcher = new ResizeWatcher();
        this.callback = callback.bind(null);
    }

    observe (target: Element | SVGElement, options: ResizeObserverOptions = getDefaultOptions()): void {
        this.resizeWatcher.addElementToMap(target, options, this);
    }

    unobserve (target: Element | SVGElement): void {
        this.resizeWatcher.removeElementFromInstance(target);
    }

    disconnect (): void {
        this.resizeWatcher.removeInstance(this);
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
