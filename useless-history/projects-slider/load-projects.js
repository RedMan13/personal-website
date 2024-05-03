const loadFile = fileName => fetch(`./projects-slider/${fileName}.json`)
    .then(req => req.json())
    .catch((err) => Promise.resolve({errored: true, err}))

window.addEventListener('load', async () => {
    const sliders = document.getElementsByClassName('slider')
    for (const slider of sliders) {
        const cards = await loadFile(slider.getAttribute('list'))
        if (cards.errored) {
            const errMessage = document.createElement('p')
            errMessage.innerText = 'Failed to get project list'
            console.error(cards.err)
            continue;
        }

        for (const [name, url, icon] of cards) {
            const container = document.createElement('div')
            const title = document.createElement('p')
            const logo = document.createElement('img')
            const br = document.createElement('br')
            container.classList.add('slideContent')
            logo.classList.add('slideImage')
            logo.src = icon 
                ? new URL(icon, url)
                : new URL('./unknown.png', window.location)
            
            title.classList.add('slideTitle')
            title.innerText = name
            container.appendChild(logo)
            container.appendChild(br)
            container.appendChild(title)
            container.onclick = () => window.open(url)
            slider.appendChild(container)
        }

        slider.style.gridTemplateColumns = `repeat(${Math.max(cards.length, 5)}, minmax(102px, 1fr))`
    }
});