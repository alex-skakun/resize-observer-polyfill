import ResizeObserver from "./resize-observer";

export interface BoxSize {
    blockSize: number;
    inlineSize: number;
}

export interface ResizeObserverEntry {
    borderBoxSize: BoxSize;
    contentBoxSize: BoxSize;
    contentRect: DOMRectReadOnly;
    target: Element | SVGElement;
}

export interface ResizeObserverOptions {
    box: 'content-box' | 'border-box';
}

export interface Dimension {
    borderWidth: number;
    borderHeight: number;
    contentHeight: number;
    contentWidth: number;
}

export interface ElementData {
    dimensionPrevious: Dimension,
    dimensionCurrent: Dimension,
    bounding: DOMRectReadOnly;
    instance: ResizeObserver;
    computedStyles: CSSStyleDeclaration;
    options: ResizeObserverOptions;
}

export interface AnimationState {
    animationPlaying: boolean;
}