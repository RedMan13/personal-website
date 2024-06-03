const scaleOffset = 0.20

window.exploading = false
window.scale = 1

const waitTime = time => new Promise(resolve => setTimeout(resolve, time))
async function initiateSelfDestruct() {
    console.log('omg you made the site expload how dare you!!!!!!!!!!!!!!!!!!!!!!!!!!!11');
    document.body.style.background = ''
    document.body.style.backgroundColor = 'red'
    exploading = true
    let timer = 10

    document.body.appendChild(await <img 
        src="./alarm.gif" 
        class="animateAlarm" 
        style="position: absolute; left: 50%; transform: translate(-50%, 0) scale(0.2);" 
    />)
    const timerText = <><p class="animateTimer" style="position: absolute; left: 50%; transform: translate(-50%, 0);">
        {timer}
    </p></>
    document.body.appendChild(timerText.p)

    const video = <video style="display: none; width: 100%; height: 100%">
        <source src="./finally your awake.mp4" type="video/mp4" />
    </video>;

    const timerInt = setInterval(async () => {
        timer--
        timerText.p = timer
        if (timer < 1) {
            document.body.style.backgroundColor = 'black'
            document.body = ''
            video.style.display = ''
            document.body.appendChild(video)
            await waitTime(1000)
            video.play().catch(() => {
                video.style.display = 'none'
                document.body.style.backgroundColor = 'white'
                document.body = `man your no fun >:(. <br> how dare you block auto video playback making it so i cant play <a href="./finally your awake.mp4">finally your awake.mp4</a>`
            })
            clearInterval(timerInt)
        }
    }, 1000)
}

// i have 0 clue how the fuck im supposed to do all this with css
function computeSize() {
    if (exploading) return
    const width = window.innerWidth
    const height = window.innerHeight
    const card = document.#main
    const cw = ((card.@width ?? +(card.style.width).slice(0, -2)) || 480) 
    const ch = ((card.@height ?? +(card.style.height).slice(0, -2)) || 360)
    const scale = Math.min(width / cw, height / ch) - scaleOffset
    if (scale <= 0) {
        scale = 0
        initiateSelfDestruct()
    }
    card.@scale = scale
    card.style.transform = `scale(${scale})`
}
window.addEventListener('DOMContentLoaded', computeSize);
window.onresize = computeSize;