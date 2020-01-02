import ResizeObserver from './resize-observer';

if (!('ResizeObserverCustom' in globalThis)) {
    globalThis.ResizeObserverCustom = ResizeObserver;
}

let count = 0;

const   test = document.getElementById('test'),
        divs = document.querySelectorAll('#test div'),
        display = document.getElementById('output'),
        line = document.getElementById('line');

const a: ResizeObserver = new globalThis.ResizeObserverCustom(entries => {
    count += entries.length;
    display.innerHTML = `${count}`;
    console.log(entries)
});


divs.forEach(div => {
    a.observe(div);
});

a.observe(line, {
    box: 'border-box'
})

test.addEventListener('click', () => {
    test.classList.toggle('animating');
});

line.classList.add('grow');
