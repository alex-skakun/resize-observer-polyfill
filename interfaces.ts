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

export interface ElementData {
    options: ResizeObserverOptions;
    rect: ClientRect;
}

export interface ElementRect {
    element: Element | SVGElement;
    rect: ClientRect;
}