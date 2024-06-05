<!DOCTYPE html>
<html style="height: 100%;">
<head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <title>godslayerakp</title>
    <meta name="author" content="godslayerakp">
    <meta name="description" content="the main page to my website!">
    <meta name="keywords" content="gsa,godslayerakp,redman13,thyme1time23,giveminecraftstone,building-x">
    <meta name="theme-color" content="white">
    <meta name="color-scheme" content="light">
    <meta name="robots" content="nosnippet">
    
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
    <!-- popup handler -->
    <script event="DOMContentLoaded">
        const warningPopup = document.getElementById('warning-modal');
        const cover = document.getElementById('cover');
        const dissmissWarning = document.getElementById('dissmissWarning');
        warningPopup.hidden = !!localStorage['dissmissed-warning'];
        cover.hidden = !!localStorage['dissmissed-warning'];
        dissmissWarning.onclick = () => {
            warningPopup.hidden = true;
            cover.hidden = true;
            localStorage['dissmissed-warning'] = 'true';
        }
    </script>
    <!-- profile link orbit controller -->
    <script event="DOMContentLoaded">
        const links = [
            ['GitHub', new URL('https://github.com/RedMan13')],
            ['Scratch', new URL('https://scratch.mit.edu/RedMan13')],
            ['PenguinMod', new URL('https://penguinmod.com/profile?user=redman13')],
            ['Roblox', new URL('https://www.roblox.com/users/749363285/profile')],
            ['Replit', new URL('https://replit.com/@RedMan13')],
            ['YouTube', new URL('https://www.youtube.com/channel/UC0NsyMcDBHFWXro1sRHRqMw')]
        ];

        const orbital = document.getElementById('orbital');
        let mouseHovering = null;
        for (const [idx, [name, link]] of Object.entries(links)) {
            // use googles favicon service for it is much more convinient then trying to extract it ourselves
            const favicon = new URL('https://www.google.com/s2/favicons');
            favicon.searchParams.set('sz', 64);
            favicon.searchParams.set('domain', link.hostname);
            
            const img = new Image();
            img.width = 20;
            img.src = favicon;
            img.title = name;

            const hyperlink = document.createElement('a');
            hyperlink.href = link;
            hyperlink.appendChild(img);
            hyperlink.idx = idx;
            hyperlink.scale = 1;
            hyperlink.style.position = 'absolute';
            hyperlink.onmouseover = () => mouseHovering = idx;
            hyperlink.onmouseleave = () => mouseHovering = null;
            links[idx] = hyperlink;

            orbital.appendChild(hyperlink);
        }

        function interpol(start, end, percent) {
            return start + (end - start) * percent;
        }
        // the time (in ms) a full revolution of the orbit should take
        const speed = 300;
        const width = 60;
        const height = 50;
        const dist = 360 / links.length;
        const deg180 = 180 * Math.PI / 180;
        const step = t => {
            for (const hyperlink of links) {
                const isHovered = mouseHovering === hyperlink.idx;
                const noneHovered = mouseHovering === null;
                const target = !isHovered && !noneHovered
                    ? 0.68
                    : 1;
                hyperlink.scale = interpol(hyperlink.scale, target, 0.1);
                hyperlink.style.filter = `brightness(${hyperlink.scale})`;
                
                const dir = ((t / speed) + (dist * hyperlink.idx)) * Math.PI / 180;
                const x = Math.cos(dir);
                const y = Math.sin(dir);

                hyperlink.style.transform = `
                translateX(${(x * width) + 230}px)
                translateY(${(y * height) - 50}px)
                scale(${hyperlink.scale})`;
            }
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    </script>
</head>
<body style="margin: 0; height: 100%;">
    <div class="popup" id="warning-modal" hidden>
        <p style="color: #FF0F0F">WARNING: im still in the process of re-building the api framework to compile on github and push to serv00. i am also still in the process of building the website, so be warned NOT EVERYTHING MAY BE IMPLEMENTED/INTENDED FOR USE</p>
        <button id="dissmissWarning">dissmiss warning</button>
    </div>
    <div id="cover" class="over-shadow" hidden></div>
    <div class="card" id="main"><br>
        <div style="
            display: flex;
            justify-content: center;
            margin-top: 20px;
            margin-bottom: 20px;
        ">
            <img src="/my-pfp.png" height="50">
        </div>
        <div id="orbital"></div></br>
        <?php
        $visitors = intval(file_get_contents('./visitors.txt')) +1;
        file_put_contents('./visitors.txt', strval($visitors));
        
        $numSuf = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'];
        $sufix = $numSuf[substr($visitors, -1)];
        if ($visitors > 9 && $visitors < 20) $sufix = 'th';
        
        echo "hie $visitors$sufix visitor!";
        ?> welcome to mie site of goofy gooberness cause silly good!!!!!! <br>
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
        <!-- btw, theres gona be a bunch of secrets on this site. try and find them all <em>WITHOUT CHEATING</em> -->
    </div>
</body>
</html>