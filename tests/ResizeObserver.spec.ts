import ResizeObserver from "../src";
import { ResizeObserverEntry } from "../src/interfaces";
import ResizeObserverType from "../src/resize-observer";
type ResizeObserver = ResizeObserverType;

describe('ResizeObserver', () => {
    let firstObserverChangesLength = 0,
        secondObserverChangesLength = 0,
        resizeObserverOne: ResizeObserver | null,
        resizeObserverTwo: ResizeObserver | null,
        style: Element,
        templateElement: Element;

    const template = `
        <div id="line"></div>
        <div id="input">
            <input type="text">
            <div></div>
        </div>
        <div id="checkbox">
            <input type="checkbox">
            <div></div>
        </div>
        <div id="hover"></div>
        <div id="animation-block">
            <div></div>
            <div></div>
        </div>
        <div id="text"></div>
    `;

    const styles = `
        #line {
            width: 100px;
            height: 30px;
            background-color: rebeccapurple;
            /* transition: padding 20s ease, margin 0s ease; */
            transition: background-color 30s ease;
            padding: 10px;
            box-sizing: content-box;
        }

        #line.grow {
            /* padding: 30px; */
            background-color: red;
        }

        #input div {
            height: 30px;
            width: 30px;
            background: blue;
        }

        #input input:focus ~ div {
            width: 100px;
        }

        #checkbox div {
            height: 30px;
            width: 30px;
            background: green;
        }

        #checkbox input:checked ~ div {
            width: 100px;
        }

        #hover {
            width: 20px;
            height: 30px;
            background-color: cadetblue;
        }

        #hover:hover {
            height: 100px;
        }

        #animation-block div:first-child {
            animation: squeeze-in-out 10s 10s alternate;
            height: 10px;
            width: 50px;
            background: black;
        }

        #animation-block div:last-child {
            animation: squeeze-in-out 10s 15s alternate;
            height: 10px;
            width: 50px;
            background: black;
        }

        @keyframes squeeze-in-out {
            100% {
                width: 50%;
            }
        }
    `;

    beforeEach(() => {
        style = document.createElement('style');
        templateElement = document.createElement('div');

        style.innerHTML = styles;
        templateElement.innerHTML = template;

        document.head.appendChild(style);
        document.body.appendChild(templateElement);
    });

    afterEach(() => {
        if (resizeObserverOne) {
            resizeObserverOne.disconnect();
            resizeObserverOne = null;
        }

        if (resizeObserverTwo) {
            resizeObserverTwo.disconnect();
            resizeObserverTwo = null;
        }
        // document.head.removeChild(style);
        // document.body.removeChild(templateElement);
    });

    describe('constructor', () => {
        it('if constructor didn\'t recieve argument - throw the error', () => {
            expect(() => {
                new ResizeObserver();
            }).toThrowError(`Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.`);
        });

        it('if constructor recieved argument, that\'s no function - throw the error', () => {
            const message = `Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.`;

            expect(() => {
                new ResizeObserver({});
            }).toThrowError(message);

            expect(() => {
                new ResizeObserver('123');
            }).toThrowError(message);

            expect(() => {
                new ResizeObserver(() => {});
            }).not.toThrow();
        });
    });

    describe('observe', () => {
    });
});