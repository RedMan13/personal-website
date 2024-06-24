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
const discoColors = [
    '#ef0a00',
    '#efc50a',
    '#aa0aef',
    '#0aef00',
    '#0a0aef'
];
async function discoParty() {
    const ball = new Image(60);
    ball.src = 'https://media1.tenor.com/m/MFDQwH-z3QoAAAAC/bullett-glitter.gif';
    await new Promise((resolve, reject) => {
        ball.onload = resolve;
        ball.onerror = reject;
    });
    ball.style.position = 'absolute';
    ball.style.top = '10px';
    ball.style.zIndex = '2';
    document.body.appendChild(ball);

    const disco = document.createElement('canvas');
    disco.width = window.innerWidth;
    disco.height = window.innerHeight;
    disco.style.position = 'absolute';
    disco.style.zIndex = '3';
    const ctx = disco.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0, 0.95)';
    ctx.fillRect(0, 0, disco.width, disco.height);
    document.body.appendChild(disco);

    await waitTime(1000);

    ctx.clearRect(0, 0, disco.width, disco.height)
    ctx.fillStyle = 'rgba(0,0,0, 0.75)';
    ctx.fillRect(0, 0, disco.width, disco.height);
    ctx.clearRect(Math.ceil(disco.width / 2) - 30, 10, 60, 60);
    console.log(50 * 20);
    for (let i = 0; i < (50 * 20); i++) {
        const x = (i % 50) + (0.5 * (i % 2)) * 600;
        const y = Math.floor(i / 50) * 60;
        console.log(i, x, y)
        ctx.moveTo(x, y);
        ctx.ellipse(
            // at xy
            x, y, 
            // with width 20 and height 20 (stretched by distance)
            20, 20 * Math.min(1, Math.sqrt((((Math.ceil(disco.width / 2) - 30) - x) ** 2) + ((10 - y) ** 2))),
            // point towards the origin point
            Math.atan2(((Math.ceil(disco.width / 2) - 30) - x) ** 2, (10 - y) ** 2),
            // with start and end rotation 360 degrees apart
            0, 2 * Math.PI
        );
        ctx.fillStyle = discoColors[i % discoColors.length];
        ctx.fill();
    }
}

// i have 0 clue how the fuck im supposed to do the scaling with css, and having it clearly saved is better anyways
function computeSize() {
    if (exploading) return
    const width = window.innerWidth
    const height = window.innerHeight
    const card = document.getElementById('main')
    const cw = ((card.width ?? +(card.style.width).slice(0, -2)) || 480) 
    const ch = ((card.height ?? +(card.style.height).slice(0, -2)) || 360)
    const scale = Math.min(width / cw, height / ch) - scaleOffset
    if (scale <= 0) {
        scale = 0
        initiateSelfDestruct()
    }
    card.setAttribute('scale', scale)
    card.style.transform = `scale(${scale})`
}
window.addEventListener('DOMContentLoaded', computeSize);
window.onresize = computeSize;