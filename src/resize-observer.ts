import { ResizeObserverEntry, ResizeObserverOptions, ElementData, ElementRect } from "./interfaces";
import { resizeWatcher } from './resize-watcher';

const OBSERVER_INSTANCES = new Map<ResizeObserver, Map<Element | SVGElement, ResizeObserverOptions>>();

export default class ResizeObserver {
    private readonly callback: (entries: Array<ResizeObserverEntry>) => void;
    private readonly targets = new Map<Element | SVGElement, ElementData>();

    constructor (callback: (entries: Array<ResizeObserverEntry>) => void) {
        this.callback = callback.bind(null);
    }

    observe (target: Element | SVGElement, options: ResizeObserverOptions = getDefaultOptions()): void {
        this.targets.set(target, {
            options,
            rect: target.getBoundingClientRect()
        });

        const instanceElementsMap = new Map();
        instanceElementsMap.set(this, this.targets);
        resizeWatcher.addElementsToMap(instanceElementsMap);
        resizeWatcher.start();
    }

    unobserve (target: Element | SVGElement): void {
        this.targets.delete(target);
        resizeWatcher.removeElementFromInstance(target);
    }

    disconnect (): void {
        this.targets.clear();
        resizeWatcher.removeInstance(this);
    }

    applyChanges (elementRects: Array<ElementRect>): void {
        let entries: Array<ResizeObserverEntry> = [];
        elementRects.forEach(({ element, rect }) => {
            this.targets.set(element, {
                ...this.targets.get(element),
                rect
            });
            entries.push({
                target: element,
                contentRect: <DOMRect>rect,
                borderBoxSize: {
                    blockSize: 0,
                    inlineSize: 0
                },
                contentBoxSize: {
                    blockSize: 0,
                    inlineSize: 0
                }
            })
        });
        this.callback(entries);
    }

}

function getDefaultOptions (): ResizeObserverOptions {
    return {
        box: 'content-box'
    };
}
