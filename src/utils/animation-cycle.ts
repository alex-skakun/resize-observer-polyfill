export class AnimationCycle {
    private frameId: number;

    constructor (private callback: () => void) {

    }

    start () {
        this.frameId = requestAnimationFrame(() => {
            this.callback();
            this.start();
        });
    }

    stop () {
        cancelAnimationFrame(this.frameId);
    }

}

