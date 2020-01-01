import ResizeObserver from './resize-observer';

if (!('ResizeObserverCustom' in globalThis)) {
    globalThis.ResizeObserverCustom = ResizeObserver;
}

let count = 0;

const   test = document.getElementById('test'),
        divs = document.querySelectorAll('#test div'),
        display = document.getElementById('output');

const a: ResizeObserver = new globalThis.ResizeObserverCustom(entries => {
    count += entries.length;
    display.innerHTML = `${count}`;
});


divs.forEach(div => {
    a.observe(div);
});

test.addEventListener('click', () => {
    test.classList.toggle('animating');
})
