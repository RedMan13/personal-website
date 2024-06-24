import 'scratch-render.min.js';
/**
 * @typedef {import('scratch-render/src/RenderWebGL').RenderWebGL} RenderWebGL
 */
/** @type {RenderWebGL} */
window.renderer = new window.ScratchRender(document.getElementById('main'));


const stacksToTick = [];
let intr;
let stepTime = (1000 / 60);
// when provided boolean true/false this controls if we are running or not
function setStepingDelay(delay) {
    if (intr) clearInterval(intr);
    if (delay === false) return;
    if (delay === true) return setSps(stepTime);
    intr = setInterval(() => {
        if (paused) return;
        stacksToTick.forEach(stack => stack.step());
    }, delay);
    stepTime = delay;
}

const blockExecutors = {
    say(txt) { window.alert(txt); },
    if(term, thenStack) {
        if (term) thenStack();
    },
    bool() { return true; }
};
class BlockStack {
    constructor(blocks, runHat, runWithoutFps) {
        this.blocks = blocks;
        this.parentIds = [];
        this.stepRunning = false;
        this.frameTree = [
            { 
                idx: +!runHat, 
                stack: blocks, 
                asap: runWithoutFps, 
                return: null 
            }
        ];
        if (runHat) this.step();
    }
    makeStackCallback(curFrame, stack) {
        return asap => {
            this.frameTree.push({
                idx: 0,
                stack,
                asap: asap || curFrame.asap,
                return: null
            });
            // run the first block of the next stack always, this way we effectively never did make a transition
            this.step();
        }
    }
    // used for procedure blocks, simply mixes some other stack list into this one
    stepTo(stack, asap) {
        this.frameTree.push({
            idx: 0,
            stack,
            asap: asap || this.frameTree.at(-1).asap,
            return: null
        });
        // run the first block of the next stack always, this way we effectively never did make a transition
        this.step();
    }
    executeReturn(block, curFrame) {
        if (block[0] === 'return') {
            curFrame.return = this.executeReturn(block[1], curFrame);
            this.frameTree.pop();
            return;
        }
        // if this is a stack (from argument) then return a callback that can be called to initiat that stack
        if (Array.isArray(block) && (typeof block[0] !== 'string')) 
            return this.makeStackCallback(curFrame, block);
        // otherwise just make sure it isnt a block to be called, if it isnt then return it
        if (!Array.isArray(block)) return block;

        const [blockId, ...blockArgs] = block;
        const args = blockArgs.map(arg => this.executeReturn(arg, curFrame));
        return blockExecutors[blockId](...args);
    }
    async step(inAsap) {
        if (this.stepRunning) return; // if we are held on something like a promise then dont try and step
        // intiat that we are running and no further calls should be made
        this.stepRunning = true;
        if (!this.frameTree.at(-1).stack[this.frameTree.at(-1).idx]) this.frameTree.pop();
        const curFrame = this.frameTree.at(-1);
        await this.executeReturn(curFrame.stack[curFrame.idx], curFrame); // run the block as soon as we can
        // only after the block runs do we then try to advance forward
        curFrame.idx++
        // if we are supposed to run as fast as possible then continue calling step until it returns us false
        // false meaning that the frame we have now stepped too (including steping out of all frames) isnt to be run asap
        if (curFrame.asap && !inAsap) while (!window.paused && await this.step(true)) {}
        // finallize the fact we have step running
        this.stepRunning = false;

        // returned for when we step into a frame that does run without fps
        return this.frameTree.at(-1)?.asap ?? false;
    }
}

function reformVarsObj(vars) {
    const idk = 'idk';
}