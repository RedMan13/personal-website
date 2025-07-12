<!TEMPLATE /cardpage.html>
<head>
    <title>My Extensions</title>
    <style>
        #main {
            text-align: center;
        }
        .tiles {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
            padding: 2px;
            border-top: 1px solid grey;
            box-shadow: inset 0px -4px 3px black;
        }
        .ext-tile {
            text-align: center;
            font-size: 12px;
            color: black;
            text-decoration: none;
            border-radius: 4px;
            overflow: hidden;
            background-color: #ccc;
        }
        .icon {
            object-fit: cover;
            width: 100%;
            aspect-ratio: 16 / 9;
            background-color: #0FBD8C;
        }
    </style>
</head>
<body>
    Hey look! its all of the extensions i have ever made!!!!<br>
    Please remember that these extensions are intended to function with <a href="https://penguinmod.com">PenguinMod</a> only.
    <div class="tiles">
        <?php
        $extensions = json_decode(file_get_contents('./built-extensions/index.json'));
        foreach ($extensions as $ext) {
            $title = $ext->name;
            $desc = $ext->description;
            $id = $ext->id;
            echo <<<END
                <a class="ext-tile" id="$id" href="/built-extensions/$id.js" download="$id.js" title="$desc">
                    <img src="/built-extensions/icons/$id.svg" alt="" class="icon"></img>
                    <span class="title">$title</span><br>
                </a>
            END;
        }
        ?>
    </div>
</body>