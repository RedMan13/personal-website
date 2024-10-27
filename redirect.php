<!TEMPLATE /cardpage.html>
<head>
    <title>Hey! are you sure?</title>

    <script>
        const target = new URL(<?= json_encode($_GET['target'])?>, location.origin);
        const expiry = +localStorage.getItem(`safesite:${target}`);
        // if this is a safe url then redirect immediatly after page load
        console.log(Date.now(), expiry)
        if (Date.now() <= expiry || [
            'discord.gg', 
            'discord.com', 
            'media.discordapp.net', 
            'assets.discordapp.com',
            'youtube.com',
            'youtu.be',
            'www.youtube.com',
            'www.youtu.be'
        ].includes(target.baseneame)) {
            window.open(target, '_self');
        } else {
            localStorage.removeItem(`safesite:${target}`);
        }
    </script>
</head>
<body>
    <h1>Hey! are you sure about that?</h1>
    <p>You've been brought here cause you clicked a url that tried to redirect you offsite!<br>
    the url in question is <code style="
        border: 1px solid rgba(0, 0, 0, 0.20);
        border-radius: 2px;
        background-color: rgba(0, 0, 0, 0.20);
        font-family: monospace;
    "><?= htmlspecialchars($_GET['target'])?></code>.</p>
    <p>Please review the site <strong><em>CAREFULLY</em></strong> if you dont recognise it as safe already.</p>
    <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        transform: scale(45%);
        height: 270px;
    ">
        <iframe sandbox="allow-scripts allow-same-origin" allow="" width="1020" height="540" style="flex-shrink: 0;"></iframe>
        <script>
            const iframe = document.getElementsByTagName('iframe')[0];
            fetch(<?= json_encode($_GET['target'])?>)
                .then(async req => {
                    if (!req.ok) {
                        iframe.hidden = true;
                        return;
                    }
                    iframe.src = URL.createObjectURL(await req.blob());
                })
                .catch(() => iframe.hidden = true);
        </script>
    </div><br>
    if you intend to go to this site regardless of safety, <a href="<?= htmlspecialchars($_GET['target'])?>">Click here</a><br>
    if this site is safe and you do intended to open it because of that (and therfor always open it without this menu) then<br> 
    set memory expiry <input min="<?= date('Y-m-d') ?>" <?= empty($_GET['expiry']) ? '' : date('Y-m-d', intval($_GET['expiry'])) ?> type="date" id="expiry"></input> and <button onclick="targetRemember()">Click here</button><br>
    <script>
        const expiryDate = document.getElementById('expiry');
        function targetRemember() {
            localStorage.setItem(`safesite:${target}`, expiryDate.valueAsNumber);
            window.open(target, '_self');
        }
    </script>
</body>