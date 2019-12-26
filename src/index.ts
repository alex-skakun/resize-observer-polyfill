import ResizeObserver from './resize-observer';

if (!('ResizeObserverCustom' in globalThis)) {
    globalThis.ResizeObserverCustom = ResizeObserver;
}

const a: ResizeObserver = new globalThis.ResizeObserverCustom(entries => {
    console.log('a-------------');
    console.log(entries);
});

const b: ResizeObserver = new globalThis.ResizeObserverCustom(entries => {
    console.log('b-------------');
    console.log(entries);
});

const divsA = document.querySelectorAll('.a'),
    divsB = document.querySelectorAll('.b');

divsA.forEach(div => {
    a.observe(div);
});

setInterval(() => {
    let start: number;
    divsA.forEach((div: HTMLElement) => {
        let height = parseInt(div.style.height);
        if (!height || height === 50) {
            start = 30;
        } else {
            start = 50;
        }
    
        
        div.style.height = `${start}px`;
    });
}, 5000);

setTimeout(() => {
    const element = document.querySelector('.a');

    a.unobserve(element);
}, 9000);


setTimeout(() => {
    divsB.forEach(div => {
        b.observe(div);
    });

    setInterval(() => {
        let start: number;
        divsB.forEach((div: HTMLElement) => {
            let height = parseInt(div.style.height);
            if (!height || height === 50) {
                start = 30;
            } else {
                start = 50;
            }
        
            
            div.style.height = `${start}px`;
        });
    }, 3000);
}, 6000)

setTimeout(() => {
    b.disconnect();
}, 30000);

setTimeout(() => {
    a.disconnect();
}, 31000);
