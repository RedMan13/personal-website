<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">

    <link rel="stylesheet" href="/site-card.css">
    <script src="/site-card.js"></script>

    <link rel="stylesheet" href="/sliders.css">
    <link rel="stylesheet" href="/popup.css">
    <?php 
    function renderSlideDiv($slides) {
        $slideLength = max(count($slides), 5);
        echo "<div class=\"slider\" style=\"grid-template-columns: repeat($slideLength, minmax(102px, 1fr));\">";
        foreach ($slides as [$title, $redirect, $image]) {
            echo <<<END
                <a class="slideContent" href="$redirect">
                    <img src="$redirect$image" class="slideImage"></img><br>
                    <p class="slideTitle">$title</p>
                </a>
            END;
        }
        echo '</div>';
    }
    ?>
    <script event="DOMContentLoaded">window.addEventListener("DOMContentLoaded", async (ev) => {
        const warningPopup = document.getElementById('warning-modal')
        const dissmissWarning = document.getElementById('dissmissWarning')
        warningPopup.hidden = !!localStorage['dissmissed-warning']
        dissmissWarning.onclick = () => {
            warningPopup.hidden = true
            localStorage['dissmissed-warning'] = 'true'
        }
    })</script>
</head>
<body>
    <div class="popup" id="warning-modal">
        <h1 style="color: #FF0F0F">WARNING: im still in the process of re-building the api framework to compile on github and push to serv00. i am also still in the process of building the website, so be warned NOT EVERYTHING MAY BE IMPLEMENTED/INTENDED FOR USE</h1>
        <button id="dissmissWarning">dissmiss warning</button>
    </div>
    <div class="card" id="main">
        hie, welcome to mie site of goofy gooberness cause silly good!!!!!! <br>
        <h3 class="horizontalCenter">all the projects i have worked on sofar</h3>
        <?php renderSlideDiv([
            ["PenguinMod", "https://penguinmod.com", "/favicon.ico"],
            ["Scratch For Discord", "https://s4d.discodes.xyz", "/scratch.png"],
            ["CC:T Discord", "https://github.com/RedMan13/cc-discord", "/../../favicon.ico"],
            ["Clamp Coding", "https://clamp-coding.vercel.app", "/favicon.png"]
        ]) ?><br>
        <h3>my well of knowledge (everything i know)</h3>
        <?php renderSlideDiv([
            ["uhhhhh idk", "/alarm.gif", null]
        ]) ?><br>
        btw, theres gona be a bunch of secrets on this site. try and find them all <em>WITHOUT CHEATING</em>
    </div>
</body>
</html>
