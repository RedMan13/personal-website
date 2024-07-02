<!TEMPLATE /cardpage.html>
<head>
    <title>Poll results!</title>
    <meta name="description" contents="Website font poll">

    <style>
        .right {
            float: right;
        }
        meter {
            position: absolute;
            left: 50%;
        }
    </style>
</head>
<body>
    <h2>Poll Results!</h2>
    Here are the all the vote results from the poll!
    <hr />

    <label for="proportional">Proportional (original)</label>
    <label for="proportional" class="right">11</label>
    <meter id="proportional"                                                      max="26" value="11"></meter><br>
    <label for="serif">Serif</label>
    <label for="serif" class="right">0</label>
    <meter id="serif"                                                             max="26" value="0"></meter><br>
    <label for="sans-serif">Sans serif (current)</label>
    <label for="sans-serif" class="right">11</label>
    <meter id="sans-serif"                                                        max="26" value="11"></meter><br>
    <label for="monospace">Monospace (invalid)</label>
    <label for="monospace" class="right">39</label>
    <meter id="monospace"                                      low="37" high="38" max="26" value="39"></meter><br>
    <label for="wingdings">Wingdings (invalid)</label>
    <label for="wingdings" class="right">1</label>
    <meter id="wingdings"                                      low="0" high="2" max="26" value="1"></meter><br>
    <label for="ddededodediamante">Ddededodediamante (invalid)</label>
    <label for="ddededodediamante" class="right">3</label>
    <meter id="ddededodediamante"                              low="0" high="5" max="26" value="3"></meter><br>
    <label for="comic-sans ms">Comic sans MS (invalid)</label>
    <label for="comic-sans ms" class="right">34</label>
    <meter id="comic-sans ms"                                  low="37" high="38" max="26" value="34"></meter><br>
</body>