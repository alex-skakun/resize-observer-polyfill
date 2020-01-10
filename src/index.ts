import ResizeObserver from './resize-observer';
import global from './schems/global';

export default (() => {
    if (typeof global.ResizeObserver !== 'undefined') {
        return global.ResizeObserver;
    }

    return ResizeObserver;
})() as ResizeObserver;
