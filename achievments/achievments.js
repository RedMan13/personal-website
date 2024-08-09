const tick = () => {
    
}

const openButton = document.createElement('button');
openButton.classList.add('open-button');
openButton.innerHTML = '<hr><hr><hr>';
openButton.hidden = !localStorage.hasAchievments;
openButton.onclick = function() {
    syncJsCssStates();
    achievments.hidden = false;
    openButton.hidden = true;
    window.onmouseup = function() {
        window.onclick = function() {
            achievments.hidden = true;
            openButton.hidden = false;
        }
    }
    let scrollingIn = false;
    let timeout = null;
    achievments.onscroll = () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            const scroll = (achievments.scrollTop +30) / 70;
            const targeted = achievments.children[Math.floor(scroll)];
            if (Math.floor(scroll) !== scroll && !scrollingIn) {
                targeted.scrollIntoView();
                scrollingIn = true;
            }
        }, 1);
        requestAnimationFrame(syncJsCssStates);
    }
};
document.body.appendChild(openButton);

function scrollTo(id) {
    openButton.onclick();
    const el = achievments.children[id];
    el.scrollIntoView();
}