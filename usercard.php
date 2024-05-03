<style>
    .user-card {
        width: 165px; 
        height: 240px; 
        left: 0px; 
        top: 0px; 
        padding: 10px; 
        white-space: nowrap; 
        overflow-wrap: break-word; 
        overflow-x: hidden; 
        overflow-y: auto; 
        border-radius: 4px; 
        border-width: 1px; 
        border-style: solid; 
        border-color: darkgrey; 
        box-shadow: 0px 0px 3px black;
    }
    .user-pfp {
        margin-right: 3px; 
        width: 50px; 
        height: 50px; 
        display: inline; 
        box-shadow: 0px 0px 3px black;
    }.
    .user-name {
        display: inline-block; 
        width: 106px; 
        overflow-x: hidden;
    }
    .user-name.tolong {ol {
        --mask: linear-gradient(to right, 
            rgba(0,0,0, 1) 0,   rgba(0,0,0, 1) 40%, 
            rgba(0,0,0, 0) 95%, rgba(0,0,0, 0) 0
        ) 100% 50% / 100% 100% repeat-x;
        
    }
</style>
<!-- js post-processor for handling things we cant expect, such as the width of some piece of text content -->
<script onload>
    const userName = document.getElementById('username')
    const usernameCont = document.getElementById('username-cont')
    const width = userName.offsetWidth
    console.log('username text width', width)
    if (width >= 106) userName.classList.add('tolong')
</script>
<div class="user-card" style="">
    <img src="/api/profiles/<?= htmlspecialchars($_GET["name"]) ?>-pfp" class="user-pfp"></img>
    <div class="user-name" id="username-cont"><span class="user-name" id="username"><?= htmlspecialchars($_GET["name"]) ?></span><div>
</div>