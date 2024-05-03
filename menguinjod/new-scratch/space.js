import { init } from './engine.js'

/* most of this css is copied from penguinmod */
const styles = `
.layer {
    position: absolute; 
    left: 0; 
    top: 0;
}
.monitor-container {
    background: hsla(215, 100%, 95%, 1);
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    padding: 3px;
}
.monitor-name {
    margin: 0 5px;
    text-align: center;
    font-weight: bold;
}
.monitor-value {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 40px;
    text-align: center;
    color: white;
    margin: 0 5px;
    border-radius: 0.25rem;
    padding: 0 2px;
    white-space: pre-wrap;
    transform: translateZ(0);
}

.askbox {
    margin: 0.5rem;
    border: 1px solid hsla(0, 0%, 0%, 0.15);
    border-radius: 0.5rem;
    border-width: 2px;
    padding: 1rem;
    background: white;
}
.askbox-textbox {
    height: 2rem;
    padding: 0 0.75rem;
    font-size: 0.625rem;
    font-weight: bold;
    color: var(--text-primary, hsla(225, 15%, 40%, 1));
    border-width: 1px;
    border-style: solid;
    border-color: var(--ui-black-transparent, hsla(0, 0%, 0%, 0.15));
    border-radius: 2rem;
    outline: none;
    cursor: text;
    transition: 0.25s ease-out;
    box-shadow: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    padding: 0 2rem 0 .75rem;
}
.askbox-confirm {
    position: absolute;
    top: calc(0.5rem / 2);
    width: calc(2rem - 0.5rem);
    height: calc(2rem - 0.5rem);
    border: none;
    border-radius: 100%;
    color: white;
    background: hsla(194, 100%, 50%, 1);
}
.askbox-question {
    font-size: 0.75rem;
    font-weight: bold;
    color: hsla(225, 15%, 40%, 1);
    padding-bottom: 0.5rem;
}`

const frameRender = document.createElement('canvas').getContext('2d')

export class Monitor extends HTMLElement {
    static observedAttributes = ['name', 'color', 'type']
    constructor() {
        super()

        const renderDom = this.attachShadow({ mode: "open" });
    }

    connectedCallback() {}
    disconnectedCallback() {}
    attributeChangedCallback(name,, newValue) {
        
    }
}
customElements.define("stage-monitor", Monitor);

export class Stage extends HTMLElement {
    static observedAttributes = ['width', 'height', 'compiled', 'interpreted']
    construtor() {
        super()

        const renderDom = this.attachShadow({ mode: 'open' })
        const stylizer = document.createElement('style')
        stylizer.innerText = styles
        renderDom.appendChild(stylizer)
        this.renderDom = renderDom
        this.compiled = true
    }
    
    attributeChangedCallback(name,, newValue) {
        if (name === 'width') {
            this.sprites.width = newValue
            this.pen.width = newValue
            this.overlays.width = newValue
            this.wrapper.style.width = `${newValue}px`
        }
        if (name === 'height') {
            this.sprites.height = newValue
            this.pen.height = newValue
            this.overlays.height = newValue
            this.wrapper.style.height = `${newValue}px`
        }
        if (name === 'compiled') this.compiled = true
        if (name === 'interpreted') this.compiled = falses
    }
    resize(width, height) {
        this.sprites.height = newValue
        this.pen.height = newValue
        this.overlays.height = newValue
        this.wrapper.style.height = `${newValue}px`
    }
    
    popupOnSprite(pos, message, thinking) {

    }
    askQuestion(q) {
        return new Promise(resolve => {
            askbox.question.innerText = q
            askbox.textbox.value = ""
            askbox.confirm.onclick = () => {
                askbox.askbox.hidden = true
                resolve(askbox.textbox.value)
            }
            askbox.askbox.hidden = false
        })
    }
    setBackground(background) {
        wrapper.style.background = background
    }
    setBackdrop(backdrop) {
        this.backdrop = backdrop
        if (this.backdrop) this.backdrop.remove()
        if (backdrop) {
            wrapper
        }
    }
    getSpriteSpace() {
        return sprites.getContext('2d')
    }
    getPenSpace() {
        return pen.getContext('2d')
    }
    getFrame() {
        frameRender.canvas.width = this.size[0]
        frameRender.canvas.height = this.size[1]
        frameRender.fillStyle = wrapper.style.background
        frameRender.fillRect(0, 0, this.size[0], this.size[1])
        frameRender.drawImage(0, 0, pen)
        frameRender.drawImage(0, 0, sprites)
        frameRender.drawImage(0, 0, monitors)
    }
}
customElements.define("stage-box", Stage);