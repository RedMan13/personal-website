const achievments = {
    'unlockAchievments': ['Find an Achievment!', 'You have found your first achievment! now you must find the rest.'],
    'clickPfp': ['Click my Pfp!', 'Why? What gain does this get you?']
};

let unlockedAchievments = localStorage.achievments?.includes?.('unlockAchievments');
localStorage.achievments ??= ''
function pushAchievment(key) {
    if (localStorage.achievments.includes(key)) return;
    localStorage.achievments += `,${key}`;
    const [title, description] = achievments[key];
    
    const msg = document.createElement('div')
    msg.classList.add('ach-card');
    msg.innerHTML = `<h4>${title}</h4><p>${description}</p>`;
    setTimeout(() => {
        msg.style.animation = 'slideOut 0.8s';
        msg.onanimationend = () => {
            document.body.removeChild(msg);
            if (!unlockedAchievments) {
                unlockedAchievments = true;
                pushAchievment('unlockAchievments');
            }
        };
    }, 3000);
    document.body.appendChild(msg);
}