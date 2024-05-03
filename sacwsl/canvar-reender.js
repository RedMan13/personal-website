debugger;
// just a reimplementation of the node emitter using the web one
// i know this looks fucking redicelus but this is valid and this will obtain the desired result
function abstractEventTarget(evTar) {
    function _genListnerWrapper(listener, event) {
        const wrapper = ev => {
            const data = ev.data
            listener(...data)
            // assume we are meant to remove on completion nomatter what if event is passed
            if (event) evTar.off(event, wrapper)
        } 
        return wrapper
    }
    Object.assign(evTar, {
        on(event, ...listeners) {
            for (const listener of listeners) {
                const wrapper = _genListnerWrapper(listener)
                evTar.addEventListener(event, wrapper)
            }
        },
        once(event, ...listeners) {
            for (const listener of listeners) {
                const wrapper = _genListnerWrapper(listener, event)
                evTar.addEventListener(event, wrapper)
            }
        },
        emit(event, ...data) {
            const ev = new Event(event)
            ev.data = data
            evTar.dispatchEvent(ev)
        },
        off: evTar.removeEventListener
    })

    return evTar
}
// wrapper for the abstractEventTarget function
class EventEmitter {
    constructor() {
        return abstractEventTarget(new EventTarget())
    }
}

const appState = Object.assign(new EventEmitter(), {
    camera: {
        pos: [0,0],
        zoom: 10,
        scalePos() {
            return [this.pos[0] * this.zoom, this.pos[1] * this.zoom]
        }
    },
    mouse: {
        pos: [0,0],
        screen: [0,0],
        downXY: [0,0],
        lastClicked: null,
        _wasDown: false,
        _dragging: false
    },
    tiles: {
        editable: [],
        gui: []
    },
    ctx: canvas.getContext('2d'),
    colors: {
        back: '#252525',
        altBack: '#606060'
    }
})
console.log(appState)
function isInside(val, top, bottom) {
    if (top < bottom) {
        const tmp = top
        top = bottom
        bottom = tmp
    }
    return val < top && val > bottom
}
function mul(arr1, arr2) {
    for (const idx in arr1) {
        const multiplier = arr2[idx] ?? arr2
        arr1[idx] *= multiplier
    }
    return arr1
}
function add(arr1, arr2) {
    for (const idx in arr1) {
        const multiplier = arr2[idx] ?? arr2
        arr1[idx] += multiplier
    }
    return arr1
}
function sub(arr1, arr2) {
    for (const idx in arr1) {
        const multiplier = arr2[idx] ?? arr2
        arr1[idx] -= multiplier
    }
    return arr1
}
function div(arr1, arr2) {
    for (const idx in arr1) {
        const multiplier = arr2[idx] ?? arr2
        arr1[idx] /= multiplier
    }
    return arr1
}
function mod(arr1, arr2) {
    for (const idx in arr1) {
        const multiplier = arr2[idx] ?? arr2
        arr1[idx] %= multiplier
    }
    return arr1
}

document.onmousemove = ev => {
    const {mouse, camera} = appState
    mouse.screen = [ev.offsetX, ev.offsetY]
    mouse.pos = [ev.offsetX * camera.scale, ev.offsetY * camera.scale]
    camera.pos[0] += ev.movementX * camera.scale
    camera.pos[1] += ev.movementY * camera.scale

    appState.emit('mousemove', ev)
    if (mouse._wasDown) {
        mouse._dragging = true
        appState.emit('mousedrag', ev.movementX, ev.movementY)
    }
    appState.emit('redraw')
}
canvas.onmousedown = e => {
    e.preventDefault()
    const {mouse} = appState
    mouse._wasDown = true
    mouse.lastClicked = null
    mouse.downXY = mouse.screen
    
    appState.emit('mouseselect')
}
canvas.onwheel = ev => {
    const {camera} = appState
    camera.pos[0] += ev.deltaX
    camera.pos[1] += -ev.deltaY
    camera.zoom += ev.deltaZ
    appState.emit('redraw')
}
document.onmouseup = e => {
    e.preventDefault()
    const {mouse} = appState
    mouse._wasDown = false
    mouse._dragging = false
    
    appState.emit('mouseup')
}

const tileGridWidth = 10
function _getPosFromIndex(idx) {
    return [idx % tileGridWidth, Math.floor(idx / tileGridWidth)]
}
function _getIndexFromPos(pos) {
    return pos[0] + (pos[1] * tileGridWidth)
}
// i know for a FACT that this should be done in WebGL or WebGPU, but i dont fucking know how and i dont feel like making
// an entire webgl framework just for this one function rn so, use a pre-generated image that we then scale up and down
// draws both the grid and the postitions on that grid
function renderBoxGrid() {
    for ()
}
appState.on('render', () => {
    const {camera} = appState
    // reset transform
    appState.ctx.resetTransform()
    appState.ctx.translate(...camera.pos)
    appState.ctx.scale(camera.zoom, camera.zoom)
    renderBoxGrid()
})
// globalize EVERYTHING that is defined here
exports = {
    appState,
    arrayMath: {
        mul,
        add,
        sub,
        div,
        mod
    },
    renderBoxGrid,
    _getPosFromIndex,
    _getIndexFromPos,
    isInside,
    abstractEventTarget,
    EventEmitter
}