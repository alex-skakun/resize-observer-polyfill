
interface BoxSize {
    blockSize: number;
    inlineSize: number;
}

interface ResizeObserverEntry {
    borderBoxSize: BoxSize;
    contentBoxSize: BoxSize;
    contentRect: DOMRectReadOnly;
    target: Element | SVGElement;
}

interface ResizeObserverOptions {
    box: 'content-box' | 'border-box';
}


const OBSERVER_INSTANCES = new WeakSet<ResizeObserver>();

export default class ResizeObserver {
    private readonly callback: (entries: Array<ResizeObserverEntry>) => void;
    private readonly targets = new Map<Element | SVGElement, ResizeObserverOptions>();

    constructor (callback: (entries: Array<ResizeObserverEntry>) => void) {
        this.callback = callback.bind(null);
    }


    observe (target: Element | SVGElement, options: ResizeObserverOptions = getDefaultOptions()) {
        this.targets.set(target, options);
        if (this.targets.size === 1) {
            window.addEventListener('resize', this, {passive: true});
        }
    }

    unobserve (target: Element | SVGElement) {
        this.targets.delete(target);
        if (this.targets.size === 0) {
            window.removeEventListener('resize', this);
        }
    }

    disconnect () {
        window.removeEventListener('resize', this);
        this.targets.clear();
    }

    handleEvent () {
        let entries: Array<ResizeObserverEntry> = [];
        for (let target of this.targets.keys()) {
            let contentRect = <DOMRect>target.getBoundingClientRect();
            entries.push({
                target,
                contentRect,
                borderBoxSize: {
                    blockSize: 0,
                    inlineSize: 0
                },
                contentBoxSize: {
                    blockSize: 0,
                    inlineSize: 0
                }
            })
        }
        this.callback(entries);
    }

}

function getDefaultOptions (): ResizeObserverOptions {
    return {
        box: 'content-box'
    };
}
