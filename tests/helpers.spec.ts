import { isFunction, isElement, concatValidSelector } from "../src/helpers/helpers";

describe('helpers functions', () => {
    describe('isFunction', () => {
        it('should return false', () => {
            expect(isFunction(true as any)).toBeFalsy();
            expect(isFunction({} as any)).toBeFalsy();
            expect(isFunction(123 as any)).toBeFalsy();
            expect(isFunction('123' as any)).toBeFalsy();
        });

        it('should return true', () => {
            expect(isFunction(() => {})).toBeTruthy();
        });
    });

    describe('isElement', () => {
        it('should return false', () => {
            expect(isElement(true as any)).toBeFalsy();
            expect(isElement({} as any)).toBeFalsy();
            expect(isElement(123 as any)).toBeFalsy();
            expect(isElement('123' as any)).toBeFalsy();
        });

        it('should return true', () => {
            expect(isElement(document.body)).toBeTruthy();
        });
    });

    describe('concatValidSelector', () => {
        it('should return valid selector', () => {
            expect(concatValidSelector('#input input:checked')).toEqual('#input input');
            expect(concatValidSelector('#input input:focus')).toEqual('#input input');
            expect(concatValidSelector('#input input:focus:not(.a)')).toEqual('#input input:not(.a)');
            expect(concatValidSelector('#input input:focus:not(.a):after')).toEqual('#input input:not(.a)');
            expect(concatValidSelector('#input input:focus:not(:focus):after')).toEqual('#input input:not(:focus)');
            expect(concatValidSelector('.was-validated .custom-control-input:valid:focus:not(:checked)'))
            .toEqual('.was-validated .custom-control-input:not(:checked)');
        });
    });
});