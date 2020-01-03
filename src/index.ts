import ResizeObserver from './resize-observer';

if (!('ResizeObserverCustom' in globalThis)) {
    globalThis.ResizeObserverCustom = ResizeObserver;
}

let count = 0;

const   test = document.getElementById('test'),
        divs = document.querySelectorAll('#test div'),
        display = document.getElementById('output'),
        line = document.getElementById('line'),
        divInput = document.querySelector('#input div'),
        divCheckbox = document.querySelector('#checkbox div');

const a: ResizeObserver = new globalThis.ResizeObserverCustom(entries => {
    // count += entries.length;
    // display.innerHTML = `${count}`;
    console.log(entries)
});

const b: ResizeObserver = new globalThis.ResizeObserverCustom(entries => {
    // count += entries.length;
    // display.innerHTML = `${count}`;
    console.log(entries)
});

const c: ResizeObserver = new globalThis.ResizeObserverCustom(entries => {
    // count += entries.length;
    // display.innerHTML = `${count}`;
    console.log(entries)
});

c.observe(divInput);
c.observe(divCheckbox);

divs.forEach(div => {
    a.observe(div);
});

b.observe(line, {
    box: 'border-box'
})

test.addEventListener('click', () => {
    test.classList.toggle('animating');
});

line.classList.add('grow');

setTimeout(() => {
    const style = document.createElement('style');
    document.head.append(style);
}, 5000);
