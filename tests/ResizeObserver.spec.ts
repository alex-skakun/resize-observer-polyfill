import ResizeObserver from "../src/resize-observer";
import { ResizeObserverEntry } from "../src/interfaces";
import { wait, animationEnd } from "./helpers";

describe('ResizeObserver', () => {
    let resizeObserverOne: ResizeObserver | null,
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
            transition: padding 3s ease;
            padding: 10px;
            box-sizing: content-box;
        }

        #line.grow {
            padding: 30px;
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
            animation: squeeze-in-out 1s 1s alternate;
            height: 10px;
            width: 50px;
            background: black;
            animation-iteration-count: 2;
        }

        #animation-block div:last-child {
            animation: squeeze-in-out 1s 1s alternate;
            height: 10px;
            width: 50px;
            background: black;
            animation-iteration-count: 2;
        }

        @keyframes squeeze-in-out {
            100% {
                width: 100px;
            }
        }
    `;

    beforeEach(done => {
        style = document.createElement('style');
        templateElement = document.createElement('div');

        style.innerHTML = styles;
        templateElement.innerHTML = template;

        document.head.appendChild(style);
        document.body.appendChild(templateElement);
        done();
    });

    afterEach(done => {
        if (resizeObserverOne) {
            resizeObserverOne.disconnect();
            resizeObserverOne = null;
        }

        if (resizeObserverTwo) {
            resizeObserverTwo.disconnect();
            resizeObserverTwo = null;
        }


        document.head.removeChild(style);
        document.body.removeChild(templateElement);
        done();
    });

    describe('constructor', () => {
        it('if constructor didn\'t recieve the argument - throw the error', () => {
            expect(() => {
                new ResizeObserver(undefined);
            }).toThrowError(`Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.`);
        });

        it('if constructor recieved the argument, that\'s no function - throw the error', () => {
            const message = `Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.`;

            expect(() => {
                new ResizeObserver({} as () => void);
            }).toThrowError(message);

            expect(() => {
                new ResizeObserver('123' as unknown as () => void);
            }).toThrowError(message);

            expect(() => {
                new ResizeObserver(() => {});
            }).not.toThrow();
        });
    });

    describe('observe', () => {
        it('if observe method didn\'t recieve the argument - throw the error', () => {
            resizeObserverOne = new ResizeObserver(() => {});
            expect(() => resizeObserverOne.observe(undefined as unknown as HTMLElement)).toThrowError(`Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.`);
        });

        it('if observe method recieved the argument, that\'s no function - throw the error', () => {
            const message = `Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element'.`;
            resizeObserverOne = new ResizeObserver(() => {});

            expect(() => resizeObserverOne.observe({} as HTMLElement)).toThrowError(message);

            expect(() => resizeObserverOne.observe('123' as unknown as HTMLElement)).toThrowError(message);

            expect(() => resizeObserverOne.observe(<HTMLElement>document.getElementById('hover-that-not-exist'))).toThrowError(message);

            expect(() => resizeObserverOne.observe(<HTMLElement>document.getElementById('hover'))).not.toThrow();
        });

        it('should emit value immediately', done => {
            let element = document.getElementById('hover');
            resizeObserverOne = new ResizeObserver((entries: Array<ResizeObserverEntry>) => {
                expect(entries.length).toEqual(1);
                expect(entries[0].target).toEqual(element);
                done();
            });

            resizeObserverOne.observe(element);
        });

        it('should emit changes on the input checked', done => {
            let input = document.querySelector('#checkbox input') as HTMLElement,
                div = document.querySelector('#checkbox div'),
                resizeEntry: ResizeObserverEntry;

            resizeObserverOne = new ResizeObserver(([entry]: Array<ResizeObserverEntry>) => {
                resizeEntry = entry;
            });
           
            resizeObserverOne.observe(div);

            Promise.resolve(input.click())
                .then(() => {
                    expect(resizeEntry.contentRect.height).toEqual(30);
                    expect(resizeEntry.contentRect.width).toEqual(100);

                    return Promise.resolve(input.click())
                })
                .then(() => {
                    expect(resizeEntry.contentRect.height).toEqual(30);
                    expect(resizeEntry.contentRect.width).toEqual(30);
                    done();
                });
        });

        it('should emit changes during transition', done => {
            let line = document.querySelector('#line') as HTMLElement,
                resizeEntry: ResizeObserverEntry;

            resizeObserverOne = new ResizeObserver(([entry]: Array<ResizeObserverEntry>) => {
                resizeEntry = entry;
            });
        
            resizeObserverOne.observe(line);

            line.classList.add('grow');

            animationEnd(line, 'transitionend')
                .then(() => {
                    expect(resizeEntry.contentRect.height).toEqual(30);
                    expect(resizeEntry.contentRect.width).toEqual(100);

                    expect(resizeEntry.borderBoxSize.blockSize).toEqual(90);
                    expect(resizeEntry.borderBoxSize.inlineSize).toEqual(160);

                    expect(resizeEntry.contentBoxSize.blockSize).toEqual(30);
                    expect(resizeEntry.contentBoxSize.inlineSize).toEqual(100);

                    done();
                });
        });

        it('should emit changes during animation', done => {
            let animationDiv = document.querySelector('#animation-block div:first-child') as HTMLElement,
                resizeEntry: ResizeObserverEntry;

            resizeObserverOne = new ResizeObserver(([entry]: Array<ResizeObserverEntry>) => {
                resizeEntry = entry;
            });
        
            resizeObserverOne.observe(animationDiv);

            animationEnd(animationDiv, 'animationstart')
                .then(() => {
                    expect(resizeEntry.contentRect.height).toEqual(10);
                    expect(resizeEntry.contentRect.width).toEqual(50);

                    expect(resizeEntry.borderBoxSize.blockSize).toEqual(10);
                    expect(resizeEntry.borderBoxSize.inlineSize).toEqual(50);

                    expect(resizeEntry.contentBoxSize.blockSize).toEqual(10);
                    expect(resizeEntry.contentBoxSize.inlineSize).toEqual(50);

                    return animationEnd(animationDiv, 'animationiteration');
                }).then(() => {
                    expect(resizeEntry.contentRect.height).toEqual(10);
                    expect(resizeEntry.contentRect.width).toEqual(100);

                    expect(resizeEntry.borderBoxSize.blockSize).toEqual(10);
                    expect(resizeEntry.borderBoxSize.inlineSize).toEqual(100);

                    expect(resizeEntry.contentBoxSize.blockSize).toEqual(10);
                    expect(resizeEntry.contentBoxSize.inlineSize).toEqual(100);

                    return animationEnd(animationDiv, 'animationend');
                }).then(() => {
                    expect(resizeEntry.contentRect.height).toEqual(10);
                    expect(resizeEntry.contentRect.width).toEqual(50);

                    expect(resizeEntry.borderBoxSize.blockSize).toEqual(10);
                    expect(resizeEntry.borderBoxSize.inlineSize).toEqual(50);

                    expect(resizeEntry.contentBoxSize.blockSize).toEqual(10);
                    expect(resizeEntry.contentBoxSize.inlineSize).toEqual(50);

                    done();
                });
        });

        it('should emit changes with few observables', done => {
            let animationDivOne = document.querySelector('#animation-block div:first-child') as HTMLElement,
                animationDivTwo = document.querySelector('#animation-block div:last-child') as HTMLElement,
                resizeEntryOne: ResizeObserverEntry,
                resizeEntryTwo: ResizeObserverEntry;

            resizeObserverOne = new ResizeObserver(([entry]: Array<ResizeObserverEntry>) => {
                resizeEntryOne = entry;
            });

            resizeObserverTwo = new ResizeObserver(([entry]: Array<ResizeObserverEntry>) => {
                resizeEntryTwo = entry;
            });
        
            resizeObserverOne.observe(animationDivOne);
            resizeObserverTwo.observe(animationDivTwo);

            Promise.all([
                animationEnd(animationDivOne, 'animationstart'),
                animationEnd(animationDivTwo, 'animationstart'),
            ]).then(() => {
                    expect(resizeEntryOne.contentRect.height).toEqual(10);
                    expect(resizeEntryOne.contentRect.width).toEqual(50);

                    expect(resizeEntryOne.borderBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryOne.borderBoxSize.inlineSize).toEqual(50);

                    expect(resizeEntryOne.contentBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryOne.contentBoxSize.inlineSize).toEqual(50);

                    expect(resizeEntryTwo.contentRect.height).toEqual(10);
                    expect(resizeEntryTwo.contentRect.width).toEqual(50);

                    expect(resizeEntryTwo.borderBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryTwo.borderBoxSize.inlineSize).toEqual(50);

                    expect(resizeEntryTwo.contentBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryTwo.contentBoxSize.inlineSize).toEqual(50);

                    return Promise.all([
                        animationEnd(animationDivOne, 'animationiteration'),
                        animationEnd(animationDivTwo, 'animationiteration')
                    ]);
                }).then(() => {
                    expect(resizeEntryOne.contentRect.height).toEqual(10);
                    expect(resizeEntryOne.contentRect.width).toEqual(100);

                    expect(resizeEntryOne.borderBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryOne.borderBoxSize.inlineSize).toEqual(100);

                    expect(resizeEntryOne.contentBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryOne.contentBoxSize.inlineSize).toEqual(100);

                    expect(resizeEntryTwo.contentRect.height).toEqual(10);
                    expect(resizeEntryTwo.contentRect.width).toEqual(100);

                    expect(resizeEntryTwo.borderBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryTwo.borderBoxSize.inlineSize).toEqual(100);

                    expect(resizeEntryTwo.contentBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryTwo.contentBoxSize.inlineSize).toEqual(100);

                    return Promise.all([
                        animationEnd(animationDivOne, 'animationend'),
                        animationEnd(animationDivTwo, 'animationend')
                    ]);
                }).then(() => {
                    expect(resizeEntryOne.contentRect.height).toEqual(10);
                    expect(resizeEntryOne.contentRect.width).toEqual(50);

                    expect(resizeEntryOne.borderBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryOne.borderBoxSize.inlineSize).toEqual(50);

                    expect(resizeEntryOne.contentBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryOne.contentBoxSize.inlineSize).toEqual(50);

                    expect(resizeEntryTwo.contentRect.height).toEqual(10);
                    expect(resizeEntryTwo.contentRect.width).toEqual(50);

                    expect(resizeEntryTwo.borderBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryTwo.borderBoxSize.inlineSize).toEqual(50);

                    expect(resizeEntryTwo.contentBoxSize.blockSize).toEqual(10);
                    expect(resizeEntryTwo.contentBoxSize.inlineSize).toEqual(50);

                    done();
                });
        });

        it('should emit changes with one observable and few elements', done => {
            let animationDivOne = document.querySelector('#animation-block div:first-child') as HTMLElement,
                animationDivTwo = document.querySelector('#animation-block div:last-child') as HTMLElement,
                resizeEntries: Array<ResizeObserverEntry>;

            resizeObserverOne = new ResizeObserver((entries: Array<ResizeObserverEntry>) => {
                resizeEntries = entries;
            });
        
            resizeObserverOne.observe(animationDivOne);
            resizeObserverOne.observe(animationDivTwo);

            Promise.all([
                animationEnd(animationDivOne, 'animationstart'),
                animationEnd(animationDivTwo, 'animationstart'),
            ]).then(() => wait(50))
            .then(() => {
                    expect(resizeEntries.length).toEqual(2);

                    return Promise.all([
                        animationEnd(animationDivOne, 'animationiteration'),
                        animationEnd(animationDivTwo, 'animationiteration')
                    ]);
                }).then(() => {
                    expect(resizeEntries.length).toEqual(2);

                    return Promise.all([
                        animationEnd(animationDivOne, 'animationend'),
                        animationEnd(animationDivTwo, 'animationend')
                    ]);
                }).then(() => {
                    expect(resizeEntries.length).toEqual(2);

                    done();
                });
        });

        it('should emit changes after text inserted', done => {
            let textNode = document.getElementById('text'),
                resizeEntry: ResizeObserverEntry;

            resizeObserverOne = new ResizeObserver(([entry]: Array<ResizeObserverEntry>) => {
                resizeEntry = entry;
            });

            resizeObserverOne.observe(textNode);

            wait(0)
                .then(() => {
                    expect(resizeEntry.contentRect.height).toEqual(0);

                    textNode.innerText = '1234';
                })
                .then(() => {
                    expect(resizeEntry.contentRect.height).not.toEqual(0);
                    done();
                });
        });

        it('should emit changes on attributes changes (style in this case)', done => {
            let line = document.getElementById('line'),
                resizeEntry: ResizeObserverEntry;

            resizeObserverOne = new ResizeObserver(([entry]: Array<ResizeObserverEntry>) => {
                resizeEntry = entry;
            });

            resizeObserverOne.observe(line);

            line.style.height = '100px';

            wait(0)
                .then(() => {
                    expect(resizeEntry.contentRect.height).toEqual(100);
                    done();
                });
        });
    });
});