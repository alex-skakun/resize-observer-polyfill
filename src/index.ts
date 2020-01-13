import ResizeObserver from './resize-observer';
import global from './schems/global';
import { Constructable } from './interfaces';

export default (() => {
    if (typeof global.ResizeObserver !== 'undefined') {
        return global.ResizeObserver;
    }

    return ResizeObserver;
})() as Constructable<ResizeObserver>;
