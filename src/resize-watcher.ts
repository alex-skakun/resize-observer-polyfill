import ResizeObserver from "./resize-observer";
import { ElementData, ResizeObserverOptions, ResizeObserverEntry, BoxSize, Dimension, AnimationState } from "./interfaces";
import { concatValidSelector } from "./helpers/helpers";

/**
 * Events, that should check changes on every invoke.
 */
const EVENTS_FOR_CHECK_RESIZE = [
    'load',
    'transitionend',
    'animationend',
    'mousemove',
    'animationcancel',
    'transitioncancel',
    'click',
    'touchstart'
];


/**
 * Events, that should run requestAnimationFrame, that should check changes during animation.
 */
const EVENTS_FOR_START_REQUEST_ANIMATION_FRAME = [
    'transitionstart',
    'animationstart'
];

/**
 * Map of properties, that can change dimension of the element.
 */
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

/**
 * Instance variable for singleton.
 */
let instance: ResizeWatcher;

export class ResizeWatcher {
    /**
     * ID of the requestAnimationFrame.
     */
    private requestID: number;

    /**
     * Map, that contains all elements, that should be checked by ResizeObservable.
     */
    private map = new Map<Element | SVGElement, ElementData>();

    /**
     * Map, that contains all elements with animation, that have properties, that can change dimension of the element.
     */
    private mapAnimationElements = new Map<Element, AnimationState>();

    /**
     * Map, that contains all elements with transition, that have properties, that can change dimension of the element.
     */
    private mapTransitionElements = new Map<Element, boolean>();

    /**
     * Map, that contains all elements with hover, that have properties, that can change dimension of the element.
     */
    private mapHoverElements = new Map<Element, boolean>();

    /**
     * Map, that contains all elements with active or focus, that have properties,
     * that can change dimension of the element.
     */
    private mapActiveFocusedElements = new Map<Element, boolean>();

    /**
     * Flag for active element.
     */
    private isElementFocused = false;

    /**
     * Map for elements, that currently animating.
     */
    private mapAnimationProcessingElements = new Map<Element, boolean>();

    /**
     * Map for elements, that currently has transition.
     */
    private mapTransitionProcessingElements = new Map<Element, boolean>();

    /**
     * Flag for listener initialization.
     */
    private isListenersInitialized = false;

    /**
     * Mutation observer instance.
     */
    private mutationObserver: MutationObserver;

    /**
     * Previous hovered element is needed to detect, if the document need to be reflowed on the mouse event.
     */
    private previousHoveredElement: Element | null = null;

    /**
     * Current hovered element is needed to detect, if the document need to be reflowed on the mouse event.
     */
    private currentHoveredElement: Element | null;

    /**
     * Method, that calls recursively and check elements for change.
     */
    private watchElements = () => {
        if (!this.mapTransitionProcessingElements.size && !this.mapAnimationProcessingElements.size) {
            return;
        }

        this.checkForUpdate();

        this.requestID = requestAnimationFrame(this.watchElements);
    }

    /**
     * Method for EVENTS_FOR_CHECK_RESIZE array.
     */
    private checkForUpdateListenersCb = ({ type: eventName, target }: Event) => {
        let animationElement = this.mapAnimationProcessingElements.get(target as Element),
            transitionElement = this.mapTransitionProcessingElements.get(target as Element),
            isAnimationEvent = eventName === 'animationend' || eventName === 'animationcancel',
            isTransitionEvent = eventName === 'transitionend' || eventName === 'transitioncancel';

        if (isAnimationEvent && animationElement) {
            this.mapAnimationProcessingElements.delete(target as Element);
        }

        if (isTransitionEvent && transitionElement) {
            this.mapTransitionProcessingElements.delete(target as Element);
        }

        if (
            (isAnimationEvent || isTransitionEvent)
            && !this.mapTransitionProcessingElements.size
            && !this.mapAnimationProcessingElements.size
        ) {
            this.stop();
            this.checkForUpdate();
        }

        if (isAnimationEvent || isTransitionEvent) {
            return;
        }
        
        // check for update only when all transitions and animations finished
        this.currentHoveredElement = this.isElementExistInTheMap(target as Element, this.mapHoverElements);

        if (
            (eventName === 'mousemove' || eventName === 'touchstart')
            && (this.currentHoveredElement !== this.previousHoveredElement)
        ) {
            this.previousHoveredElement = this.currentHoveredElement;
            this.checkForUpdate();
            return;
        }

        let isFocusedElementInTheMap = this.isElementExistInTheMap(target as Element, this.mapActiveFocusedElements);

        if (eventName === 'click' && isFocusedElementInTheMap) {
            this.isElementFocused = true;
            this.checkForUpdate();
            return;
        }

        if (eventName === 'click' && this.isElementFocused && !isFocusedElementInTheMap) {
            this.isElementFocused = false;
            this.checkForUpdate();
            return;
        }

        if (eventName === 'load' || isAnimationEvent || isTransitionEvent) {
            this.checkForUpdate();
        }
    }

    /**
     * Method for EVENTS_FOR_START_REQUEST_ANIMATION_FRAME array.
     */
    private requestListenersCb = ({ type: eventName, target }: Event) => {
        if (eventName === 'transitionstart' && this.mapTransitionElements.get(target as Element)) {
            this.mapTransitionProcessingElements.set(target as Element, true);
            this.start();
            return;
        }

        /**
         * ComputedStyle needs to detect animation state,
         * if the tab was reloaded and your main tab was another tab. In this case if animation has playState 'pause',
         * it doesn't matter, it will be fire start method.
         */
        if (
            eventName === 'animationstart'
            && this.mapAnimationElements.get(target as Element)
            && getComputedStyle(target as Element).animationPlayState === 'running'
        ) {
            this.mapAnimationProcessingElements.set(target as Element, true);
            this.start();
        }
    }

    /**
     * Resize cb.
     */

    private resizeCb = () => this.checkForUpdate();

    constructor () {
        // this is for singleton
        if (instance) {
            return instance;
        }

        instance = this;

        return this;
    }

    /**
     * Append element to the map, that should be used for detect changes.
     * 
     * @param element HTML element.
     * @param options Options for observer: 'content-box' or 'border-box'.
     * @param instance Instance of the observable.
     */
    addElementToMap (element: Element | SVGElement, options: ResizeObserverOptions, instance: ResizeObserver): void {
        if (!this.isListenersInitialized) {
            this.init();
        }

        if (this.map.get(element)) {
            return;
        }

        let elementData = this.getElementData(element, options, instance);
        this.map.set(element, elementData);
        instance.applyChanges([this.getTargetEntry(element, elementData)]);
    }

    /**
     * Remove element from the map.
     * 
     * @param element HTML element.
     */
    removeElementFromInstance (element: Element | SVGElement): void {
        this.map.forEach((value, key) => {
            if (element === key) {
                this.map.delete(key);
            }
        });

        if (!this.map.size) {
            this.destroy();
        }
    }

    /**
     * Method, that delete all elements with instance, that will be provided.
     * 
     * @param instance Observer instance.
     */
    removeInstance (instance: ResizeObserver): void {
        this.map.forEach((value, key) => {
            if (instance === value.instance) {
                this.map.delete(key);
            }
        });

        if (!this.map.size) {
            this.destroy();
        }
    }

    /**
     * Start ping changes during the animation.
     */
    private start (): void {
        this.stop();

        this.requestID = requestAnimationFrame(this.watchElements);
    }

    /**
     * Stop ping changes.
     */
    private stop (): void {
        if (this.requestID) {
            cancelAnimationFrame(this.requestID);
        }
    }

    private isElementExistInTheMap (element: Element, map: Map<Element, boolean>): Element | null {
        if (map.get(element)) {
            return element;
        } else {
            let parentElement = element.parentElement;
            return parentElement ? this.isElementExistInTheMap(parentElement, map) : null;
        }
    }

    /**
     * Method, that forms ResizeObserverEntry object.
     * 
     * @param target
     * @param param1 ElementData object.
     * 
     * @returns {ResizeObserverEntry}
     */
    private getTargetEntry (
        target: Element | SVGElement,
        { bounding, computedStyles, options }: ElementData
    ): ResizeObserverEntry {
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

    /**
     * This method will call only once, when the new element will be added to the map.
     * 
     * 
     * @param target 
     * @param options 
     * @param instance 
     * 
     * @returns {ElementData}
     */
    private getElementData (
        target: Element | SVGElement,
        options: ResizeObserverOptions, instance: ResizeObserver
    ): ElementData {
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

    /**
     * Helper method, which return sum of the properties.
     * 
     * @param properties 
     * @param computedStyles 
     * 
     * @returns {number} Returns sum.
     */
    private getSumOfProperties (properties: Array<string>, computedStyles: CSSStyleDeclaration): number {
        let sum = 0;
        properties.forEach(property => {
            sum += parseFloat(computedStyles[property]);
        });
        return sum;
    }

    /**
     * Method, that check elements for their cahnges.
     */
    private checkForUpdate (): void {
        let currentRects = new Map<Element | SVGElement, ElementData>(),
            instancesMap = new Map<ResizeObserver, Array<ResizeObserverEntry>>();

        // itarate over all elements in the map and collect all their new boundings and computedStyles.
        // this will cause only one reflow of the page
        this.map.forEach((value, key) => {
            currentRects.set(key, {
                ...value,
                bounding: key.getBoundingClientRect(),
                computedStyles: getComputedStyle(key),
            });
        });

        // iterate over new values of the elements
        currentRects.forEach((value, target) => {
            value.dimensionPrevious = value.dimensionCurrent;
            value.dimensionCurrent = {
                borderHeight: value.bounding.height,
                borderWidth: value.bounding.width,
                contentHeight: value.bounding.height - this.getSumOfProperties(['paddingTop', 'paddingBottom', 'borderTop', 'borderBottom'], value.computedStyles),
                contentWidth: value.bounding.width - this.getSumOfProperties(['paddingLeft', 'paddingRight', 'borderLeft', 'borderRight'], value.computedStyles)
            };

            // if width or height not equal -
            //  set this element to the instance map and update main map with new data of the element
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

        // throw changed elements outside
        instancesMap.forEach((elementRects, instance) => {
            instance.applyChanges(elementRects);
        });
    }

    /**
     * Method, that generate map for transitions and animations elements.
     * This method prevent observable from running request method,
     * if the target element not exist in the animation map or transition map.
     */
    private setAnimationElementsToMap (): void {
        const   { styleSheets } = document,
                keyframesRules = new Map<string, boolean>(),
                animationsRules: Array<CSSStyleRule> = [];

        // function, that detect if the element with animation has property in the animation,
        // that can change the dimension
        const isAnimationHasResizeProperty = ({ cssText, name }: CSSKeyframesRule): void => {
            /**
             * reg - regular expression to parse cssText value from CSSKeyframesRule
             */
            let reg = /([\w\-]+):/gi,
                match = reg.exec(cssText),
                property: string;

            while (match != null) {
                property = match[1];
                /**
                 * If property contains in the RESIZE_PROPERTIES_MAP - then add it to the keyframesRules map.
                 * After that we can break cycle, because it doesn't matter if we know,
                 * if one the properties already exist in the RESIZE_PROPERTIES_MAP.
                 */ 
                
                if (RESIZE_PROPERTIES_MAP[property]) {
                    keyframesRules.set(name, true);
                    break;
                }

                match = reg.exec(cssText);
            }
        };

        const isTransitionHasResizeProperty = ({ transitionProperty }: CSSStyleDeclaration): boolean => {
            /**
             * reg - regular expression to parse transitionProperty value from style.
             */
            let reg = /([\w\-]+),?/gi,
                match = reg.exec(transitionProperty),
                property: string;

            while (match != null) {
                property = match[1];
                /**
                 * If property contains in the RESIZE_PROPERTIES_MAP - then add it to the keyframesRules map.
                 * After that we can break cycle, because it doesn't matter if we know,
                 * if one the properties already exist in the RESIZE_PROPERTIES_MAP.
                 */ 

                if (RESIZE_PROPERTIES_MAP[property]) {
                    return true;
                }

                match = reg.exec(transitionProperty);
            }

            return false;
        };

        /**
         * Iterate over styleSheets to find all elements with transition and animation.
         */
        for (let styleSheet of styleSheets) {
            for (let cssRule of (styleSheet as any).cssRules) {
                // Collect all keyFramesRules, that contains resize properties.
                if (cssRule instanceof CSSKeyframesRule) {
                    isAnimationHasResizeProperty(cssRule);
                    continue;
                }

                let { style, selectorText } = cssRule;

                // We can't collect animations right away, because we should iterate over animations,
                // that will be collected into the keyframesRules map after cycle will finish.
                if (cssRule instanceof CSSStyleRule && style.animation) {
                    animationsRules.push(cssRule);
                }

                // But we can collect all elements with ttransitions,
                // that pass this condition, right away in the transition map.
                if (cssRule instanceof CSSStyleRule && style.transition && isTransitionHasResizeProperty(style)) {
                    const element = document.querySelector(selectorText);
                    this.mapTransitionElements.set(element, true);
                }

                // Collect all elements with hover.
                if (/:hover/g.test(selectorText)) {
                    const selectors = (selectorText as string).split(',');

                    selectors.forEach(selector => {
                        let match = /(.+):hover/g.exec(selector.trim()),
                            element = match ? document.querySelector(
                                concatValidSelector((match as RegExpExecArray)[0])
                            ) as Element : null;

                        if (element) {
                            this.mapHoverElements.set(element, true);
                        }
                    });
                }

                // Collect all elements with focus, active and checked pseudo-classes.
                if (/:(focus|active|checked)/g.test(selectorText)) {
                    const selectors = (selectorText as string).split(',');

                    selectors.forEach(selector => {
                        let match = /(.+):(focus|active|checked)/g.exec(selector.trim()),
                            element = match ? document.querySelector(
                                concatValidSelector((match as RegExpExecArray)[0])
                            ) as Element : null;

                        if (element) {
                            this.mapActiveFocusedElements.set(element, true);
                        }
                    });
                }
            }
        }

        /**
         * Iterate over animationRules to collect elements to the animation map, that pass condition with animationName.
         */
        for (let i = 0, animation: CSSStyleRule; i < animationsRules.length; i++) {
            animation = animationsRules[i];
            if (keyframesRules.get(animation.style.animationName)) {
                const element = document.querySelector(animation.selectorText) as Element;

                this.mapAnimationElements.set(element, {
                    animationPlaying: animation.style.animationPlayState === 'running'
                });
            }
        }
    }

    /**
     * Mutation observer initializer.
     */
    private initializeMutationObserver (): void {
        const config = {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true
        };

        const callback = (mutationsList: Array<MutationRecord>) =>  {
            // Flag, that help to detect, if the element has animation.
            let isAnimationTargetExist = false;

            // Iterate over mutationList to find, if something has animation.
            // It needs to detect animation, if the animation already running, but it paused for some time.
            mutationsList.forEach(mutation => {
                if (this.mapAnimationElements.get(mutation.target as Element)) {
                    const computedStyle = getComputedStyle((mutation.target as HTMLElement));
                    if (computedStyle.animationPlayState === 'running') {
                        isAnimationTargetExist = true;
                        this.mapAnimationProcessingElements.set(mutation.target as Element, true);
                    } else {
                        this.mapAnimationProcessingElements.delete(mutation.target as Element);
                    }
                }
            });

            // Iterate over mutationList to detect, if something is the style node.
            let isStyleNode = mutationsList.some(mutation => {
                return [...mutation.addedNodes].some((node: Node) => (node as Element).localName === 'style');
            });

            // If style node - update animation and transition maps.
            if (isStyleNode) {
                this.setAnimationElementsToMap();
            }

            if (isAnimationTargetExist) {
                this.start();
            }

            if (
                !isAnimationTargetExist
                && !this.mapAnimationProcessingElements.size
                && !this.mapTransitionProcessingElements.size
            ) {
                this.stop();
            }

            // If request is not running - detect changes.
            if (!this.mapAnimationProcessingElements.size && !this.mapTransitionProcessingElements.size) {
                this.checkForUpdate();
            }
        };

        this.mutationObserver = new MutationObserver(callback);

        this.mutationObserver.observe(document, config);
    }

    /**
     * Initialize EVENTS_FOR_START_REQUEST_ANIMATION_FRAME listeners.
     */
    private inititalizeRequestListeners (): void {
        EVENTS_FOR_START_REQUEST_ANIMATION_FRAME.forEach(eventName => {
            document.addEventListener(eventName, this.requestListenersCb);
        });
    }

    /**
     * Initialize EVENTS_FOR_CHECK_RESIZE listeners.
     */
    private initializeCheckForUpdateListeners (): void {
        EVENTS_FOR_CHECK_RESIZE.forEach(eventName => {
            document.addEventListener(eventName, this.checkForUpdateListenersCb);
        });

        window.addEventListener('resize', this.resizeCb);
    }

    /**
     * Remove EVENTS_FOR_START_REQUEST_ANIMATION_FRAME listeners.
     */
    private removeRequestListeners (): void {
        EVENTS_FOR_START_REQUEST_ANIMATION_FRAME.forEach(eventName => {
            document.removeEventListener(eventName, this.requestListenersCb);
        });
    }

    /**
     * Remove EVENTS_FOR_CHECK_RESIZE listeners.
     */
    private removeCheckForUpdateListeners (): void {
        EVENTS_FOR_CHECK_RESIZE.forEach(eventName => {
            document.removeEventListener(eventName, this.checkForUpdateListenersCb);
        });

        window.removeEventListener('resize', this.resizeCb);
    }

    /**
     * Initialize all listeners and mutation observer, also generate map for all animations elements.
     */
    private init (): void {
        this.isListenersInitialized = true;
        this.setAnimationElementsToMap();
        this.initializeMutationObserver();
        this.initializeCheckForUpdateListeners();
        this.inititalizeRequestListeners();
    }

    /**
     * Remove all listeners and disconnect from mutation observer, also clear all maps.
     */
    private destroy (): void {
        this.isListenersInitialized = false;
        this.stop();
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        this.removeCheckForUpdateListeners();
        this.removeRequestListeners();
        this.mapActiveFocusedElements.clear();
        this.mapAnimationElements.clear();
        this.mapAnimationProcessingElements.clear();
        this.mapHoverElements.clear();
        this.mapTransitionElements.clear();
        this.mapTransitionProcessingElements.clear();
    }

}
