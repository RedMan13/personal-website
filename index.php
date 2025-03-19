<!TEMPLATE /cardpage.html>
<?php
# from https://stackoverflow.com/a/2690541
function time2str($ts) {
    if(!ctype_digit($ts))
        $ts = strtotime($ts);

    $diff = time() - $ts;
    if($diff == 0)
        return 'now';
    elseif($diff > 0) {
        $day_diff = floor($diff / 86400);
        if($day_diff == 0)
        {
            if($diff < 60) return 'just now';
            if($diff < 120) return '1 minute ago';
            if($diff < 3600) return floor($diff / 60) . ' minutes ago';
            if($diff < 7200) return '1 hour ago';
            if($diff < 86400) return floor($diff / 3600) . ' hours ago';
        }
        if($day_diff == 1) return 'Yesterday';
        if($day_diff < 7) return $day_diff . ' days ago';
        if($day_diff < 31) return ceil($day_diff / 7) . ' weeks ago';
        if($day_diff < 60) return 'last month';
        return date('F Y', $ts);
    }
    else {
        $diff = abs($diff);
        $day_diff = floor($diff / 86400);
        if($day_diff == 0) {
            if($diff < 120) return 'in a minute';
            if($diff < 3600) return 'in ' . floor($diff / 60) . ' minutes';
            if($diff < 7200) return 'in an hour';
            if($diff < 86400) return 'in ' . floor($diff / 3600) . ' hours';
        }
        if($day_diff == 1) return 'Tomorrow';
        if($day_diff < 4) return date('l', $ts);
        if($day_diff < 7 + (7 - date('w'))) return 'next week';
        if(ceil($day_diff / 7) < 4) return 'in ' . ceil($day_diff / 7) . ' weeks';
        if(date('n', $ts) == date('n') + 1) return 'next month';
        return date('F Y', $ts);
    }
}

function renderSlideDiv($slides) {
    $slideLength = max(count($slides), 5);
    echo "<div class=\"slider\" style=\"grid-template-columns: repeat($slideLength, minmax(102px, 1fr));\">";
    foreach ($slides as [$title, $redirect, $image]) {
        if ($image == "") $image = '/github.png';
        else $image = "$redirect$image";
        echo <<<END
            <a class="slideContent" href="$redirect">
                <img src="$image" class="slideImage"></img><br>
                <p class="slideTitle">$title</p>
            </a>
        END;
    }
    echo '</div>';
}

$visitors = file_exists('./visitors.txt') 
    ? intval(file_get_contents('./visitors.txt')) +1
    : 1;
file_put_contents('./visitors.txt', strval($visitors));

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
            height: 90px;
            object-fit: fill;
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
        .footer-grid {
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            grid-template-rows: 174px 174px;
        }
        .footer-grid-item {
            padding: 4px;
        }
        .commits-box {
            box-shadow: inset 0px 0px 4px black;
            padding: 8px;
        }
        .commit-user {
            border-radius: 50%;
            width: 1.50lh;
            margin: .125lh;
            margin-top: .25lh;
            grid-row: 1 / 3;
        }
        .commit-time {
            font-size: small;
            color: #999;
        }
        .commit-message {
            font-size: small;
            grid-column: 2 / 4;
            overflow: clip;
        }
        .commit {
            display: grid;
            grid-template-columns: calc(1.75lh + 2px) 1fr max-content;
            grid-template-rows: 1lh .75lh;
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
            ['The Powder Toy', new URL('https://powdertoy.co.uk/User.html?Name=thepowderkeg')],
            ['GitHub', new URL('https://github.com/RedMan13'), './github.png'],
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
        for (const [idx, [name, link, icon]] of Object.entries(links)) {
            // use googles favicon service for it is much more convinient then trying to extract it ourselves
            // only exception is the first and last element, as these are part of the webrings
            let favicon = icon;
            if (!favicon) {
                favicon = new URL('https://www.google.com/s2/favicons');
                favicon.searchParams.set('sz', 64);
                favicon.searchParams.set('domain', link.hostname);
            }

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
        ["CC:T Discord", "https://github.com/RedMan13/cc-discord", ""],
        ["Clamp Coding", "https://clamp-coding.vercel.app", "/favicon.png"],
        ["DiscordNT", "/discordnt.html", "/../favicon.ico"],
        ["Builder", "https://github.com/RedMan13/builder", ""]
    ]) ?>
    <h3 class="horizontalCenter">here are some other cool sites you should check out!</h3>
    <ul>
        <li><a href="https://gen1x.is-a.dev/">Gen1x's Website (works in XP-era Internet Explorer!)</a></li>
        <li><a href="https://theshovel.rocks/">JodieTheShovel's website! dont forget to check out cofunk (previously penguinfunk) if you like fnf multiplayer!</a></li>
        <li><a href="https://jeremygamer13.vercel.app/">JeremyGamer13's site! try to get every atchievment <em>without cheating</em></a></li>
        <li><a href="https://ddededodediamante.vercel.app">ddededodediamantes website! (guys cool trust 🙏)</a></li>
    </ul><br>
    
    <div class="footer-grid">
        <iframe class="footer-grid-item" src="https://discord.com/widget?id=1248818317364301967&theme=dark" width="234" height="343.75" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>
        <div class="commits-box">
            <h4 class="horizontalCenter" style="margin: 0">Commits</h4>
            <div id="commits">
                <?php 
                if (file_exists('./commits.json')) {
                    $commits = json_decode(file_get_contents('./commits.json'), true);
                    foreach ($commits as $commit) {
                        $time = time2str($commit['timestamp']);
                        $name = $commit['author']['name'];
                        $pfp = "https://github.com/$name.png";
                        $username = $commit['author']['username'] ?? $commit['author']['name'];
                        $url = $commit['url'];
                        $message = $commit['message'];
                        echo <<<END
                            <div class="commit">
                                <img class="commit-user" src="$pfp"/>
                                <strong>$username</strong>
                                <span class="commit-time">$time</span>
                                <a href="$url" class="commit-message">$message</a>
                            </div>
                        END;
                    }
                }
                ?>
            </div>
        </div>
        <div class="footer-grid-item"></div>
        <p class="footer-grid-item">btw check out my discord! i will be sending like updates and shizz there</p>
    </div>
</body>
