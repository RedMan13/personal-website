<!TEMPLATE /cardpage.html>
<head>
    <title>Hey! are you sure?</title>

    <script>
        const target = <?= json_encode($_GET['target'])?>;
        const expiry = +localStorage.getItem(`safesite:${target}`);
        if (Date.now() <= expiry) {
            window.open(target, '_self');
        } else {
            localStorage.removeItem(`safesite:${target}`);
        }

        const newExpiry = document.getElementById('expiry');
        function targetRemember() {
            localStorage.setItem(`safesite:${target}`, Date.now() + newExpiry.value);
            window.open(target, '_self');
        }
    </script>
</head>
<body>
    <h1>Hey! are you sure about that?</h1>
    <p>You've been brought here cause you clicked a url that tried to targetect you offsite!<br>
    the url in question is <code style="
        border: 1px solid rgba(0, 0, 0, 0.20);
        border-radius: 2px;
        background-color: rgba(0, 0, 0, 0.20);
        font-family: monospace;
    "><?= htmlspecialchars($_GET['target'])?></code>.<p>
    <p>Please review the url <strong><em>CAREFULLY</em></strong> if you dont recognise it as safe already.<p>
    if you intend to go to this url regardless of safety, <a href="<?= htmlspecialchars($_GET['target'])?>">Click here</a><br>
    if this url is safe and you do intended to open it because of that, (and therfor always open it without this menu) then<br> 
    set memory expiry <input placeholder="<?= empty($_GET['expiry']) ? '' : htmlspecialchars($_GET['expiry'])?>" type="number" id="expiry"></input> and <button onclick="targetRemember()">Click here</button><br>
</body>