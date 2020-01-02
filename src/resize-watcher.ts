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

class ResizeWatcher {
    private requestID: number;
    private map = new Map<Element | SVGElement, ElementData>();
    private mapAnimationElements = new Map<Element, AnimationState>();
    private isAnimating = false;
    private isTransitioning = false;
    private watchElements = () => {
        if (!this.map.size) {
            return;
        }
        
        this.checkForUpdate();

        this.requestID = requestAnimationFrame(this.watchElements);
    };

    constructor () {
        this.initializeMutationObserver();
        this.initializeCheckForUpdateListeners();
        this.inititalizeRequestListeners();
        this.setAnimationElementsMap();
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
    }

    removeInstance (instance: ResizeObserver): void {
        this.map.forEach((value, key) => {
            if (instance === value.instance) {
                this.map.delete(key);
            }
        });
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

    private setAnimationElementsMap (): void {
        const { styleSheets } = document;

        for (let styleSheet of styleSheets) {
            console.log(styleSheet)
            for (let cssRule of (styleSheet as any).cssRules) {
                let { selectorText, style } = cssRule;
                if (!style) {
                    continue;
                }

                const element = document.querySelector(selectorText);

                if (style.animation && !this.mapAnimationElements.get(element)) {
                    this.mapAnimationElements.set(element, {
                        animationPlaying: style.animationPlayState === 'running'
                    });
                }
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

            let isAnimationTargetExist = false;
            let isAnimating = mutationsList.some(mutation => {
                if (this.mapAnimationElements.get(mutation.target as Element)) {
                    const computedStyle = getComputedStyle((mutation.target as HTMLElement));
                    isAnimationTargetExist = true;
                    return computedStyle.animationPlayState === 'running';
                }

                return false;
            });

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

        const observer = new MutationObserver(callback);

        observer.observe(document, config);
    }

    private inititalizeRequestListeners (): void {
        EVENTS_FOR_START_REQUEST_ANIMATION_FRAME.forEach(eventName => {
            document.addEventListener(eventName, () => {
                if (eventName === 'transitionstart') {
                    this.isTransitioning = true;
                }

                if (eventName === 'animationstart') {
                    this.isAnimating = true;
                }

                this.start();
            });
        });
    }

    private initializeCheckForUpdateListeners (): void {
        EVENTS_FOR_CHECK_RESIZE.forEach(eventName => {
            document.addEventListener(eventName, () => {
                if (eventName === 'animationend') {
                    this.isAnimating = false;
                }

                if (eventName === 'transitionend') {
                    this.isTransitioning = false;
                }

                if (!this.isTransitioning && !this.isAnimating) {
                    this.stop();
                }

                if (this.isAnimating || this.isTransitioning) {
                    return;
                }
                
                this.checkForUpdate();
            });
        });

        window.addEventListener('resize', this.checkForUpdate)
    }

}

export const resizeWatcher = new ResizeWatcher();
