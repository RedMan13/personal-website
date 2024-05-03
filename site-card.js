const scaleOffset = 0.20

window.exploading = false
window.scale = 1

const waitTime = time => new Promise(resolve => setTimeout(resolve, time))
async function initiateSelfDestruct() {
    console.log('omg you made the site expload how dare you!!!!!!!!!!!!!!!!!!!!!!!!!!!11')
    document.body.style.background = ''
    document.body.style.backgroundColor = 'red'
    exploading = true
    let timer = 10
    const timerText = document.createElement('p')
    timerText.style.position = 'absolute'
    timerText.style.left = '50%'
    timerText.style.transform = 'translate(-50%, 0)'
    timerText.innerText = timer
    timerText.classList.add('animateTimer')

    const alarm = document.createElement('img')
    alarm.src = './alarm.gif'
    await new Promise(resolve => {
        alarm.onload = resolve
        alarm.onerror = () => {
            console.error('aw man what the fuck, the alarm gif couldnt be loaded')
        }
    })
    alarm.style.position = 'absolute'
    alarm.style.left = '50%'
    alarm.style.transform = 'translate(-50%, 0) scale(0.2)'
    alarm.classList.add('animateAlarm')

    document.body.appendChild(alarm)
    document.body.appendChild(timerText)

    const video = document.createElement('video')
    video.style.display = 'none'
    video.style.width = '100%'
    video.style.height = '100%'
    video.innerHTML = '<source src="./finally your awake.mp4" type="video/mp4" />'

    const timerInt = setInterval(async () => {
        timer--
        timerText.innerText = timer
        if (timer < 1) {
            document.body.style.backgroundColor = 'black'
            document.body.innerHTML = ''
            video.style.display = ''
            document.body.appendChild(video)
            await waitTime(1000)
            video.play().catch(() => {
                video.style.display = 'none'
                document.body.style.backgroundColor = 'white'
                document.body.innerHTML = `man your no fun >:(. <br> how dare you block auto video playback making it so i cant play <a href="./finally your awake.mp4">finally your awake.mp4</a>`
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
    const card = document.getElementById('main')
    scale = Math.min(width / 480, height / 360) - scaleOffset
    if (scale <= 0) {
        scale = 0
        initiateSelfDestruct()
    }
    card.style.transform = `scale(${scale})`
}
window.onload = computeSize;
window.onresize = computeSize;