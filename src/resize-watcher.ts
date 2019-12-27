import ResizeObserver from "./resize-observer";
import { ElementData, ResizeObserverOptions, ResizeObserverEntry, BoxSize, Dimension } from "./interfaces";

class ResizeWatcher {
    private requestID: number;
    private map = new Map<Element | SVGElement, ElementData>();
    private watchElements = () => {
        if (!this.map.size) {
            return;
        }
        
        this.checkForUpdate();

        this.requestID = requestAnimationFrame(this.watchElements);
    };

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
        let borderBoxSize: BoxSize, contentBoxSize: BoxSize, contentRect: DOMRectReadOnly;

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
                y: top,
                toJSON: () => JSON.stringify(this)
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
                bounding: key.getBoundingClientRect(),
                instance: value.instance,
                computedStyles: getComputedStyle(key),
                options: value.options,
                dimensionPrevious: value.dimensionPrevious,
                dimensionCurrent:  value.dimensionCurrent
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
                    bounding: value.bounding,
                    computedStyles: value.computedStyles,
                    dimensionCurrent: value.dimensionCurrent,
                    dimensionPrevious: value.dimensionPrevious
                });
            }
        });

        instancesMap.forEach((elementRects, instance) => {
            instance.applyChanges(elementRects);
        });
    }

}

export const resizeWatcher = new ResizeWatcher();
