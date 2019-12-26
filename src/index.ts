import ResizeObserver from './resize-observer';

if (!('ResizeObserver' in globalThis)) {
    globalThis.ResizeObserver = ResizeObserver;
}
