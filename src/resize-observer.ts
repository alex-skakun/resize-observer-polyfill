import { ResizeObserverEntry, ResizeObserverOptions } from "./interfaces";
import { ResizeWatcher } from './resize-watcher';
import { isFunction, isElement } from './helpers/helpers';

export default class ResizeObserver {
    private readonly callback: (entries: Array<ResizeObserverEntry>) => void;
    private resizeWatcher: ResizeWatcher;

    constructor (callback: (entries: Array<ResizeObserverEntry>) => void) {
        if (typeof callback === 'undefined') {
            throw new Error(`Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.`);
        }

        if (!isFunction(callback)) {
            throw new Error(`Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.`);
        }

        this.resizeWatcher = new ResizeWatcher();
        this.callback = callback.bind(null);
    }

    observe (target: Element | SVGElement, options: ResizeObserverOptions = getDefaultOptions()): void {
        if (typeof target === 'undefined') {
            throw new Error(
                `Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.`
            );
        }

        if (!isElement(target as HTMLElement)) {
            throw new Error(`Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element'.`);
        }

        this.resizeWatcher.addElementToMap(target, options, this);
    }

    unobserve (target: Element | SVGElement): void {
        if (typeof target === 'undefined') {
            throw new Error(
                `Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.`
            );
        }

        if (!isElement(target as HTMLElement)) {
            throw new Error(`Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element'.`);
        }

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
