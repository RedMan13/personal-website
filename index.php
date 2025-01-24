<!TEMPLATE /cardpage.html>
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

$visitors = NAN;
if (file_exists('~/.mongo.json')) {
    $conf = json_decode(file_get_contents('~/.mongo.json'));
    $client = new MongoDB\Client($conf['server']);
    $base = $client->selectDatabase($conf['database']);
    $collect = $base->general;
    $doc = $collect->findOne(['isVisitors' -> true]);
    $visitors = $doc['count'] +1;
    $collect->updateOne(['isVisitors' -> true], ['count' -> $visitors]);
}
$numSuf = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'];
$sufix = $numSuf[substr($visitors, -1)];
if ($visitors > 9 && $visitors < 20) $sufix = 'th';
?>
<head>
    <title>godslayerakp</title>
    <meta name="description" content="the main page to my website!">

    <style>
        .slideImage {
            display: block;
            margin-left: auto;
            margin-right: auto;
            margin-top: 6px;
            width: 90px;
            height: auto;
            object-fit: scale-down;
        }
        .slideTitle {
            margin-top: 0px;
        }
        .slideContent {
            width: 102px;
            height: auto;
            text-align: center;
            border-width: 1px;
            border-color: darkgrey;
            box-shadow: 0px 0px 4px black;
            margin-top: 8px;
            margin-left: 6px;
            margin-right: 6px;
            margin-bottom: 8px;
        }
        .slideContent:hover {
            box-shadow: 0px 0px 8px black;
            cursor: pointer;
        }
        .slider {
            margin-top: 12px;
            overflow-x: scroll;
            display: grid;
            grid-gap: 12px;
            box-shadow: inset 0px 0px 4px black;
        }
    </style>
</head>
<body><br>
    <div
        id="orbital"  
        style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: 20px;
            margin-bottom: 40px;
            height: 50px;
        "
    >
        <img style="position: absolute; z-index: 0;" src="/my-pfp.png" height="50" onclick="pushAchievment('clickPfp')">
    </div>
    <!-- profile link orbit controller -->
    <script>
        const links = [
            ['GitHub', new URL('https://github.com/RedMan13')],
            ['Scratch', new URL('https://scratch.mit.edu/RedMan13')],
            ['PenguinMod', new URL('https://penguinmod.com/profile?user=redman13')],
            ['Roblox', new URL('https://www.roblox.com/users/749363285/profile')],
            ['Replit', new URL('https://replit.com/@RedMan13')],
            ['YouTube', new URL('https://www.youtube.com/channel/UC0NsyMcDBHFWXro1sRHRqMw')]
        ];
        const prevIdx = Math.floor(links.length / 2);
        links.splice(prevIdx, 0, ['Previous Person', new URL('https://steve0greatness.github.io/webring/sites/godslayerakp/prev.xhtml')]);
        const nextIdx = 0;
        links.splice(nextIdx, 0, ['Next Person', new URL('https://steve0greatness.github.io/webring/sites/godslayerakp/next.xhtml')]);

        const orbital = document.getElementById('orbital');
        let mouseHovering = null;
        for (const [idx, [name, link]] of Object.entries(links)) {
            // use googles favicon service for it is much more convinient then trying to extract it ourselves
            // only exception is the first and last element, as these are part of the webrings
            const favicon = new URL('https://www.google.com/s2/favicons');
            favicon.searchParams.set('sz', 64);
            favicon.searchParams.set('domain', link.hostname);
            
            const img = new Image();
            img.width = 20;
            img.src = favicon;
            if (idx == (prevIdx +1)) img.src = '/webring-prev.png';
            if (idx == nextIdx) img.src = '/webring-next.png';
            img.title = name;

            const hyperlink = document.createElement('a');
            hyperlink.href = link;
            hyperlink.appendChild(img);
            hyperlink.idx = idx;
            hyperlink.scale = 1;
            hyperlink.biasedX = 0;
            hyperlink.biasedY = 0;
            hyperlink.style.position = 'absolute';
            hyperlink.onmouseover = () => mouseHovering = idx;
            links[idx] = hyperlink;

            orbital.appendChild(hyperlink);
        }

        // the time (in ms) a full revolution of the orbit should take
        const speed = 300;
        const width = 60;
        const height = 50;
        const dist = 360 / links.length;
        const deg180 = 180 * Math.PI / 180;
        let mouseX = 0;
        let mouseY = 0;
        document.onmousemove = e => {
            const width = window.innerWidth / 2;
            const height = window.innerHeight / 2;
            const bodyWidth = 240 * scale;
            const bodyHeight = 180 * scale;
            const centerX = (width - bodyWidth) + ((orbital.clientWidth / 2) * scale);
            const centerY = (height - bodyHeight) + ((orbital.offsetTop + 30) * scale);
            
            mouseX = ((e.x - centerX) / scale);
            mouseY = ((e.y - centerY) / scale) + 8;
        }
        const step = t => {
            for (const hyperlink of links) {
                const { idx, scale } = hyperlink
                const isHovered = mouseHovering === idx;
                const noneHovered = mouseHovering === null;
                const target = !isHovered && !noneHovered
                    ? 0.68
                    : 1;
                hyperlink.scale = interpol(scale, target, 0.1);
                hyperlink.style.filter = `brightness(${scale})`;
                hyperlink.biasedX ||= 0;
                hyperlink.biasedY ||= 0;
                
                const dir = ((t / speed) + (dist * idx)) * Math.PI / 180;
                hyperlink.biasedX = interpol(hyperlink.biasedX, Math.cos(dir) * width, 0.2);
                hyperlink.biasedY = interpol(hyperlink.biasedY, (Math.sin(dir) * height) + 5, 0.2);
                if (isHovered) {
                    hyperlink.biasedX = interpol(hyperlink.biasedX, mouseX, 0.3);
                    hyperlink.biasedY = interpol(hyperlink.biasedY, mouseY, 0.3);
                }
                const mouseXDist = (hyperlink.biasedX - mouseX);
                const mouseYDist = (hyperlink.biasedY - mouseY);
                const mouseDist = Math.sqrt(Math.abs((mouseXDist * mouseXDist) - (mouseYDist * mouseYDist)));
                if (mouseDist > 10 && isHovered) mouseHovering = null;

                hyperlink.style.transform = `
                translateX(${hyperlink.biasedX}px)
                translateY(${hyperlink.biasedY}px)
                scale(${hyperlink.scale})`;
            }
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    </script>

    <span title="Since the latest commit to the site">
        <?= "hie $visitors$sufix visitor!" ?>
    </span> welcome to mie site of goofy gooberness cause silly good!!!!!! <br>
    this website is a participant of the <a href="https://steve0greatness.github.io/webring">0greatness webring!</a><br>
    <h3 class="horizontalCenter">all the projects i have worked on sofar</h3>
    <?php renderSlideDiv([
        ["PenguinMod", "https://penguinmod.com", "/favicon.ico"],
        ["Scratch For Discord", "https://s4d.discodes.xyz", "/scratch.png"],
        ["CC:T Discord", "https://github.com/RedMan13/cc-discord", "/../../favicon.ico"],
        ["Clamp Coding", "https://clamp-coding.vercel.app", "/favicon.png"]
    ]) ?>
    <h3>here are some other cool sites you should check out!</h3>
    <ul>
        <li><a href="https://gen1x.is-a.dev/">Gen1x's Website (works in XP-era Internet Explorer!)</a></li>
        <li><a href="https://theshovel.rocks/">JodieTheShovel's website! dont forget to check out cofunk (previously penguinfunk) if you like fnf multiplayer!</a></li>
        <li><a href="https://jeremygamer13.vercel.app/">JeremyGamer13's site! try to get every atchievment <em>without cheating</em></a></li>
        <li><a href="https://ddededodediamante.vercel.app">ddededodediamantes website! (guys cool trust 🙏)</a></li>
    </ul><br>
    
    <div style="display: grid; grid-template-columns: repeat(2, 1fr);">
        <iframe style="margin: 8px; margin-right: 4px; grid-row: 1;" src="https://discord.com/widget?id=1248818317364301967&theme=dark" width="234" height="343.75" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>
        <p style="margin: 8px; margin-left: 4px; grid-row: 1;">btw check out my discord! i will be sending like updates and shizz there</p>
    </div>
</body>
