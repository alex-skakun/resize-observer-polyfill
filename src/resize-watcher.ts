import ResizeObserver from "./resize-observer";
import { ElementData, ResizeObserverOptions, ResizeObserverEntry, BoxSize, Dimension, AnimationState } from "./interfaces";

const EVENTS_FOR_CHECK_RESIZE = [
    'load',
    'transitionend',
    'animationend',
    'mousemove',
    'animationcancel',
    'transitioncancel'
];

const EVENTS_FOR_START_REQUEST_ANIMATION_FRAME = [
    'transitionstart',
    'animationstart',
    'animationiteration'
];

const RESIZE_PROPERTIES_MAP = {
    'width': true,
    'max-width': true,
    'min-width': true,
    'height': true,
    'max-height': true,
    'min-height': true,
    'padding': true,
    'padding-right': true,
    'padding-left': true,
    'padding-bottom': true,
    'padding-top': true,
    'margin': true,
    'margin-right': true,
    'margin-left': true,
    'margin-bottom': true,
    'margin-top': true,
    'transform': true,
    'top': true,
    'bottom': true,
    'left': true,
    'right': true,
    'line-height': true,
    'border': true,
    'border-width': true,
    'border-top': true,
    'border-top-width': true,
    'border-bottom': true,
    'border-bottom-width': true,
    'border-left': true,
    'border-left-width': true,
    'border-right': true,
    'border-right-width': true,
};

let instance: ResizeWatcher;

export class ResizeWatcher {
    private requestID: number;
    private map = new Map<Element | SVGElement, ElementData>();
    private mapAnimationElements = new Map<Element, AnimationState>();
    private mapTransitionElements = new Map<Element, boolean>();
    private isAnimating = false;
    private isTransitioning = false;
    private isListenersInitialized = false;
    private mutationObserver: MutationObserver;
    private watchElements = () => {
        this.checkForUpdate();

        this.requestID = requestAnimationFrame(this.watchElements);
    };
    private checkForUpdateListenersCb = ({ type: eventName, target }: Event) => {
        let isAnimationElement = this.mapAnimationElements.get(target as Element),
            isTransitionElement = this.mapTransitionElements.get(target as Element);

        if ((eventName === 'animationend' || eventName === 'animationcancel') && isAnimationElement) {
            this.isAnimating = false;
        }

        if ((eventName === 'transitionend' || eventName === 'transitioncancel') && isTransitionElement) {
            this.isTransitioning = false;
        }

        if (!this.isTransitioning && !this.isAnimating) {
            this.stop();
        }

        if (
            this.isAnimating || this.isTransitioning
            || ((eventName === 'animationend' || eventName === 'animationcancel') && !isAnimationElement)
            || ((eventName === 'transitionend' || eventName === 'transitioncancel') && !isTransitionElement)
        ) {
            return;
        }
        
        this.checkForUpdate();
    };
    private requestListenersCb = ({ type: eventName, target }: Event) => {
        if (eventName === 'transitionstart' && this.mapTransitionElements.get(target as Element)) {
            this.isTransitioning = true;
            this.start();
        }

        if (eventName === 'animationstart' || eventName === 'animationiteration' && this.mapAnimationElements.get(target as Element)) {
            this.isAnimating = true;
            this.start();
        }
    };

    constructor () {
        if (instance) {
            return instance;
        }

        console.log('here')
        this.setAnimationElementsToMap();
        instance = this;

        return this;
    }

    start (): void {
        this.stop();

        this.requestID = requestAnimationFrame(this.watchElements);
    }

    stop (): void {
        if (this.requestID) {
            cancelAnimationFrame(this.requestID);
        }
    }

    addElementToMap (element: Element | SVGElement, options: ResizeObserverOptions, instance: ResizeObserver): void {
        if (!this.isListenersInitialized) {
            this.initAllListeners();
        }

        if (this.map.get(element)) {
            return;
        }

        this.map.set(element, this.getElementData(element, options, instance));
    }

    removeElementFromInstance (element: Element | SVGElement): void {
        this.map.forEach((value, key) => {
            if (element === key) {
                this.map.delete(key);
            }
        });

        if (!this.map.size) {
            this.stop();
            this.destroyAllListeners();
        }
    }

    removeInstance (instance: ResizeObserver): void {
        this.map.forEach((value, key) => {
            if (instance === value.instance) {
                this.map.delete(key);
            }
        });

        if (!this.map.size) {
            this.stop();
            this.destroyAllListeners();
        }
    }

    getElementData (target: Element | SVGElement, options: ResizeObserverOptions, instance: ResizeObserver): ElementData {
        let bounding = target.getBoundingClientRect(),
            computedStyles = getComputedStyle(target);

        return {
            dimensionPrevious: <Dimension>{},
            dimensionCurrent: {
                borderHeight: bounding.height,
                borderWidth: bounding.width,
                contentHeight: bounding.height - this.getSumOfProperties(['paddingTop', 'paddingBottom', 'borderTop', 'borderBottom'], computedStyles),
                contentWidth: bounding.width - this.getSumOfProperties(['paddingLeft', 'paddingRight', 'borderLeft', 'borderRight'], computedStyles)
            },
            bounding,
            options,
            instance,
            computedStyles 
        };
    }

    getTargetEntry (target: Element | SVGElement, { bounding, computedStyles, options }: ElementData): ResizeObserverEntry {
        let borderBoxSize: BoxSize, contentBoxSize: BoxSize, contentRect: Partial<DOMRectReadOnly>;

        borderBoxSize = {
            blockSize: bounding.height,
            inlineSize: bounding.width
        };

        contentBoxSize = {
            blockSize: bounding.height - this.getSumOfProperties(['paddingTop', 'paddingBottom', 'borderTop', 'borderBottom'], computedStyles),
            inlineSize: bounding.width - this.getSumOfProperties(['paddingLeft', 'paddingRight', 'borderLeft', 'borderRight'], computedStyles),
        };

        if (options.box === 'border-box') {
            contentRect = bounding;
        } else {
            let left = bounding.left - this.getSumOfProperties(['paddingLeft', 'borderLeft'], computedStyles),
                top = bounding.top - this.getSumOfProperties(['paddingTop', 'borderTop'], computedStyles);

            contentRect = {
                bottom: bounding.bottom - this.getSumOfProperties(['paddingBottom', 'borderBottom'], computedStyles),
                height: contentBoxSize.blockSize,
                left,
                right: bounding.right - this.getSumOfProperties(['paddingRight', 'borderRight'], computedStyles),
                top,
                width: contentBoxSize.inlineSize,
                x: left,
                y: top
            };
        }

        return  {
            target,
            contentRect,
            borderBoxSize,
            contentBoxSize
        };
    }

    private getSumOfProperties (properties: Array<string>, computedStyles: CSSStyleDeclaration): number {
        let sum = 0;
        properties.forEach(property => {
            sum += parseFloat(computedStyles[property]);
        });
        return sum;
    }

    private checkForUpdate (): void {
        let currentRects = new Map<Element | SVGElement, ElementData>(),
            instancesMap = new Map<ResizeObserver, Array<ResizeObserverEntry>>();

        this.map.forEach((value, key) => {
            currentRects.set(key, {
                ...value,
                bounding: key.getBoundingClientRect(),
                computedStyles: getComputedStyle(key),
            });
        });

        currentRects.forEach((value, target) => {
            value.dimensionPrevious = value.dimensionCurrent;
            value.dimensionCurrent = {
                borderHeight: value.bounding.height,
                borderWidth: value.bounding.width,
                contentHeight: value.bounding.height - this.getSumOfProperties(['paddingTop', 'paddingBottom', 'borderTop', 'borderBottom'], value.computedStyles),
                contentWidth: value.bounding.width - this.getSumOfProperties(['paddingLeft', 'paddingRight', 'borderLeft', 'borderRight'], value.computedStyles)
            }

            if (
                (
                    value.options.box === 'border-box'
                    && (
                        value.dimensionPrevious.borderWidth !== value.dimensionCurrent.borderWidth
                        || value.dimensionPrevious.borderHeight !== value.dimensionCurrent.borderHeight
                    )
                )
                || 
                (
                    value.options.box === 'content-box'
                    && (
                        value.dimensionPrevious.contentWidth !== value.dimensionCurrent.contentWidth
                        || value.dimensionPrevious.contentHeight !== value.dimensionCurrent.contentHeight
                    )
                )
            ) {
                let instanceData = instancesMap.get(value.instance),
                    instanceElements = instanceData ? instanceData : [];

                instancesMap.set(value.instance, [
                    ...instanceElements,
                    this.getTargetEntry(target, value)
                ]);

                this.map.set(target, {
                    ...this.map.get(target),
                    ...value
                });
            }
        });

        instancesMap.forEach((elementRects, instance) => {
            instance.applyChanges(elementRects);
        });
    }

    private setAnimationElementsToMap (): void {
        const   { styleSheets } = document,
                keyframesRules = new Map<string, boolean>(),
                animationsRules: Array<CSSStyleRule> = [];

        const isAnimationHasResizeProperty = ({ cssText, name }: CSSKeyframesRule): void => {
            const reg = /([\w\-]+):/gi;
            let match = reg.exec(cssText),
                property: string;

            while (match != null) {
                property = match[1];
                if (RESIZE_PROPERTIES_MAP[property]) {
                    keyframesRules.set(name, true);
                    break;
                }

                match = reg.exec(cssText);
            }
        };

        const isTransitionHasResizeProperty = ({ transitionProperty }: CSSStyleDeclaration): boolean => {
            const reg = /([\w\-]+),?/gi;
            let match = reg.exec(transitionProperty),
                property: string;

            while (match != null) {
                property = match[1];
                if (RESIZE_PROPERTIES_MAP[property]) {
                    return true;
                }

                match = reg.exec(transitionProperty);
            }

            return false;
        };

        for (let styleSheet of styleSheets) {
            console.log(styleSheet)
            for (let cssRule of (styleSheet as any).cssRules) {
                if (cssRule instanceof CSSKeyframesRule) {
                    isAnimationHasResizeProperty(cssRule);
                    continue;
                }

                let { style } = cssRule;

                if (cssRule instanceof CSSStyleRule && style.animation) {
                    animationsRules.push(cssRule);
                }

                if (cssRule instanceof CSSStyleRule && style.transition && isTransitionHasResizeProperty(style)) {
                    const element = document.querySelector(cssRule.selectorText);
                    this.mapTransitionElements.set(element, true);
                }
            }
        }

        for (let i = 0, animation: CSSStyleRule; i < animationsRules.length; i++) {
            animation = animationsRules[i];
            if (keyframesRules.get(animation.style.animationName)) {
                const element = document.querySelector(animation.selectorText);

                this.mapAnimationElements.set(element, {
                    animationPlaying: animation.style.animationPlayState === 'running'
                });
            }
        }
    }

    private initializeMutationObserver (): void {
        const config = {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true
        };

        const callback = (mutationsList: Array<MutationRecord>) =>  {
            console.log(mutationsList)

            let isAnimationTargetExist = false;
            let isAnimating = mutationsList.some(mutation => {
                if (this.mapAnimationElements.get(mutation.target as Element)) {
                    const computedStyle = getComputedStyle((mutation.target as HTMLElement));
                    isAnimationTargetExist = true;
                    return computedStyle.animationPlayState === 'running';
                }

                return false;
            });

            let isStyleNode = mutationsList.some(mutation => {
                return [...mutation.addedNodes].some((node: Element) => node.localName === 'style');
            });

            if (isStyleNode) {
                this.setAnimationElementsToMap();
            }

            if (isAnimating && isAnimationTargetExist) {
                this.isAnimating = true;
                this.start();
            }
            
            if (!isAnimating && isAnimationTargetExist) {
                this.isAnimating = false;

                if (!this.isTransitioning) {
                    this.stop();
                }
            }

            
            if (!this.isAnimating) {
                this.checkForUpdate();
            }
        };

        this.mutationObserver = new MutationObserver(callback);

        this.mutationObserver.observe(document, config);
    }

    private inititalizeRequestListeners (): void {
        EVENTS_FOR_START_REQUEST_ANIMATION_FRAME.forEach(eventName => {
            document.addEventListener(eventName, this.requestListenersCb);
        });
    }

    private initializeCheckForUpdateListeners (): void {
        EVENTS_FOR_CHECK_RESIZE.forEach(eventName => {
            document.addEventListener(eventName, this.checkForUpdateListenersCb);
        });

        window.addEventListener('resize', this.checkForUpdate)
    }

    private removeRequestListeners (): void {
        EVENTS_FOR_START_REQUEST_ANIMATION_FRAME.forEach(eventName => {
            document.removeEventListener(eventName, this.requestListenersCb);
        });
    }

    private removeCheckForUpdateListeners (): void {
        EVENTS_FOR_CHECK_RESIZE.forEach(eventName => {
            document.removeEventListener(eventName, this.checkForUpdateListenersCb);
        });

        window.removeEventListener('resize', this.checkForUpdate)
    }

    private initAllListeners (): void {
        this.initializeMutationObserver();
        this.initializeCheckForUpdateListeners();
        this.inititalizeRequestListeners();
        this.isListenersInitialized = true;
    }

    private destroyAllListeners (): void {
        this.mutationObserver.disconnect();
        this.removeCheckForUpdateListeners();
        this.removeRequestListeners();
        this.isListenersInitialized = false;
    }

}
