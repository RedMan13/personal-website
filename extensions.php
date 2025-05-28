<!TEMPLATE /cardpage.html>
<head>
    <title>GSA Extensions</title>
    <style>
        .tiles {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
            padding: 2px;
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