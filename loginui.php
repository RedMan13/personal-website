
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">

    <link rel="stylesheet" href="/site-card.css">
    <script src="/site-card.js"></script>
    <script>
        window.addEventListener('load', () => {
            const checkBox = document.getElementById('create')
            const inputBox = document.getElementById('create-info')
            checkBox.onchange = () => 
                inputBox.style.display = checkBox.checked
                    ? 'block'
                    : 'none'
        })
    </script>
</head>
<body>
    <form class="card" id="main" method="post" enctype="multipart/form-data" action="/handle-account">
        <label for="password">Token:</label>
        <input type="password" name="password"><br>
        
        <label for="create">create a new account?</label>
        <input type="checkbox" id="create" name="create" <?= $_GET['create'] ? 'checked' : '' ?>"><br>
        
        <div id="create-info" style="display: <?= $_GET['create'] ? 'block' : 'none' ?>;">
            <label for="username">Username:</label>
            <input type="text" name="username" value="bingus"><br>
            
            <label for="pfp">select a pfp:</label>
            <!-- idk if like thats real or nah tha the image element can load any image mime type, but i think it is -->
            <input type="file" name="pfp" accept="image/*"><br>
            
            <label for="banner">select a banner:</label>
            <input type="file" name="banner" accept="image/*"><br>
            
            <label for="banner">set user description:</label>
            <input type="text" name="username" value="might be a human"><br>
            <label for="poron">set pronouns:</label>
            <input type="text" name="poron" value="they/them"><br>
        </div>
        <br>
        <input type="submit">
    </form>
</body>
</html>
