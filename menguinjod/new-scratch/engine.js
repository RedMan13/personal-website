export default function init(compiled, stage) {
    window.renderer = new stage()
    renderer.addMonitor('test', 'omg it has content?!?!?!?!?!?!')
    renderer.askQuestion('hello, does this work?')
}