import ResizeObserver from "./resize-observer";
import { ElementData, ElementRect } from "./interfaces";

interface PrevCurrentClientRect {
    prev: ClientRect;
    current: ClientRect;
    instance: ResizeObserver;
}

interface ElementDataWithInstance extends ElementData {
    instance: ResizeObserver;
}

class ResizeWatcher {
    private requestID: number;
    private concatMap = new Map<Element | SVGElement, ElementDataWithInstance>();
    private watchElements = () => {
        console.log(this.concatMap.size)
        if (!this.concatMap.size) {
            return;
        }
        
        this.checkForUpdate();

        this.requestID = requestAnimationFrame(this.watchElements);
    };

    start (): void {
        this.stop();
        console.log(this.concatMap)

        this.requestID = requestAnimationFrame(this.watchElements);
    }

    stop (): void {
        if (this.requestID) {
            cancelAnimationFrame(this.requestID);
        }
    }

    addElementsToMap (instances: Map<ResizeObserver, Map<Element | SVGElement, ElementData>>): void {
        instances.forEach((instanceValue, instanceKey) => {
            instanceValue.forEach((elementValue, elementKey) => {
                this.concatMap.set(elementKey, {
                    ...elementValue,
                    instance: instanceKey
                });
            });
        });
    }

    removeElementFromInstance (element: Element | SVGElement): void {
        this.concatMap.forEach((value, key) => {
            if (element === key) {
                this.concatMap.delete(key);
            }
        }); 
    }

    removeInstance (instance: ResizeObserver): void {
        this.concatMap.forEach((value, key) => {
            if (instance === value.instance) {
                this.concatMap.delete(key);
            }
        });
    }

    private checkForUpdate (): void {
        let currentRects = new Map<Element | SVGElement, PrevCurrentClientRect>(),
            instancesMap = new Map<ResizeObserver, Array<ElementRect>>();

        this.concatMap.forEach((value, key) => {
            currentRects.set(key, {
                current: key.getBoundingClientRect(),
                prev: value.rect,
                instance: value.instance
            });
        });

        currentRects.forEach((value, element) => {
            if (value.current.width !== value.prev.width || value.current.height !== value.prev.height) {
                const instanceElements = instancesMap.get(value.instance);
                if (instanceElements) {
                    instancesMap.set(value.instance, [
                        ...instanceElements,
                        {
                            element,
                            rect: value.current
                        }
                    ]);
                } else {
                    instancesMap.set(value.instance, [
                        {
                            element,
                            rect: value.current
                        }
                    ]);
                }

                this.concatMap.set(element, {
                    ...this.concatMap.get(element),
                    rect: value.current
                })
            }
        });

        instancesMap.forEach((elementRects, instance) => {
            instance.applyChanges(elementRects);
        });
    }

}

export const resizeWatcher = new ResizeWatcher();
