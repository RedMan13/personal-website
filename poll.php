<!TEMPLATE /cardpage.html>
<head>
    <title>Which one is better?</title>
    <meta name="description" contents="Website font poll">
</head>
<body>
    <?php
    $fontname = array_keys($_GET)[0];
    if (empty($fontname)) {
        $hide = false;
    } else {
        $hide = true;
        $votes = json_decode(file_get_contents('./votes.json'), true);
        $votes[$fontname]++;
        file_put_contents('./votes.json', json_encode($votes));
    }
    ?>
    <div <?= $hide ? '' : 'hidden'?>>
        <h2>Thank you for voting!</h2>
        i will be checking the vote counts later and using that to decide on a font to use accross the whole site
    </div>
    <form <?= $hide ? 'hidden' : ''?>>
        <h2>Please vote on one of the following</h2>

        <input type="radio" name="proportional" id="font"></input>
        <label for="proportional" style="font-family: proportional;">Current (proportional)</label><br>

        <input type="radio" name="serif" id="font"></input>
        <label for="serif" style="font-family: serif;">Serif</label><br>

        <input type="radio" name="sans-serif" id="font"></input>
        <label for="serif" style="font-family: sans-serif;">Sans Serif</label><br>

        <input type="radio" name="monospace" id="font"></input>
        <label for="serif" style="font-family: monospace;">Monospace</label><br>
        <br>
        <input type="submit"></input>
    </form>
</body>