<!DOCTYPE html>
<html style="width: 100%; height: 100%;">
<head>
    <title>PuzzlingGGG</title>
    <meta name="author" content="puzzlingggg">
    <meta name="description" content="a webpage for joe(puzzlingggg)!">
    <meta name="keywords" content="puzz,puzzling,puzzlingggg,joe">
    <meta name="creator" content="godslayerakp, puzzlingggg">
    <meta name="theme-color" content="grey">
    <meta name="color-scheme" content="dark">
    <meta name="robots" content="nosnippet">
  
    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0px;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        .JOE {
            object-fit: cover;
            width: 250%;
            height: 250%;
            background: #66fffc;
            filter: brightness(20%);
        }
        .joefo {
            position: absolute;
            padding-top: 70px;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            text-align: center;
            color: #ccc;
        }
        .accounts {
            display: flex;
            justify-content: center;
        }

        .profile-image {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            margin: 0 auto 10px;
            display: block;
        }
    </style>
</head>
<body>
    <img class="JOE" src="/joeback.svg" />
    <div class="joefo">
        <img class="profile-image" src="/puzzlingggg.jpg" />
        hi!!!!!! im joe!!!!!!!!!!!<br>
        also known as puzzlingggg!!!!<br>
        i make music and youtube videos!!!!!!!<br>
        <br>
        <div class="accounts">
            <?php
            $accounts = [
                'https://www.twitch.tv/puzzlingishere',
                'https://www.youtube.com/@PuzzlingGGG/featured',
                'https://twitter.com/PuzzlingGGG',
                'https://www.tiktok.com/@puzzlingggg',
                'https://discord.gg/KgVGtvqJKB',
                'https://puzzlingggg.newgrounds.com/audio',
                'https://github.com/puzzlingggg',
                'https://itch.io/profile/puzzlingggg',
                'https://cocrea.world/@PuzzlingGGG',
                'https://steamcommunity.com/id/puzzlingGGG/'
            ];
    
            foreach ($accounts as $url) {
                $domain = parse_url($url, PHP_URL_HOST);
                echo <<<END
                    <a style="margin-left: 2px; margin-right: 2px;" href="$url">
                        <img style="width: 2rem; height: 2rem;" src="https://www.google.com/s2/favicons?sz=64&domain=$domain" />
                    </a>
                END;
            }
            ?>
        </div>
    </div>
</body>
</html>
