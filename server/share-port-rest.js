const ShareManager = require('./share-port');

function escape(str) {
    return String(str).replace(/[<>&'"]/g, c => {
        switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        }
    });
}
function generateFileList(files, displayOwner, owner) {
    return `
        <body style="margin: 0px;">
            <table style="width: 100vw;">
                <thead>
                    <tr style="background-color: grey;">
                        <th scope="col" style="width: 75vw">Name</th>
                        ${displayOwner ? '<th scope="col">Owner</th>' : ''}
                        <th scope="col" style="width: 200px">Date</th>
                        <th scope="col" style="width: 0px">Size</th>
                    </tr>
                </thead>
                <tbody>
                    ${files.map(file => `<tr>
                        <td style="background-color: #aFaFaF; word-break: break-word;"><a href="/${escape(file.owner ?? owner)}/file/${escape(file.name)}">
                            <div class="icon" style="width: 32px; height: 32px; display: inline-block; vertical-align: middle;" src="/${escape(file.owner ?? owner)}/icon/${escape(file.name)}"></div>
                            ${escape(file.name)}
                        </a></td>
                        ${displayOwner ? `<td style="background-color: #aFaFaF;">${escape(file.owner ?? owner)}</td>` : ''}
                        <td style="background-color: #aFaFaF;">${new Date(file.date).toLocaleString()}</td>
                        <td style="background-color: #aFaFaF;">${(() => {
                            if (file.size / 1000_000_000_000 >= 1) return `${(file.size / 1000_000_000_000).toFixed(2)}TB`;
                            if (file.size / 1000_000_000 >= 1) return `${(file.size / 1000_000_000).toFixed(2)}GB`;
                            if (file.size / 1000_000 >= 1) return `${(file.size / 1000_000).toFixed(2)}MB`;
                            if (file.size / 1000 >= 1) return `${(file.size / 1000).toFixed(2)}KB`;
                            return `${file.size}B`;
                        })()}</td>
                    </tr>`).join('')}
                </tbody>
            </table>    
            <script>
                const files = [...document.getElementsByClassName('icon')];
                window.onscroll = () => {
                    for (let i = 0; i < files.length; i++) {
                        if (files[i].firstChild !== null) continue;
                        const bound = files[i].getBoundingClientRect();
                        if (bound.top < -70) continue;
                        if (bound.bottom > window.innerHeight +70) break;
                        const image = new Image();
                        image.style.height = image.style.width = '100%';
                        image.style.objectFit = 'contain';
                        image.src = files[i].getAttribute('src');
                        files[i].appendChild(image);
                    }
                }
                window.onscroll();
            </script>
        </body>
    `;
}

module.exports = server => {
    server.ws('/share-port', ShareManager.openSharePort);
    server.get(/^\/file\/(?<filename>.*)/i, async (req, res) => {
        const [share, size, name, handle, stream] = await ShareManager.openFileRead(req.params.filename, true);
        res.header('Content-Length', size);
        res.header('Content-Type', mime.lookup(name));
        stream.pipe(res);
        share.closeFile(handle);
    });
    server.get(/^\/icon\/(?<filename>.*)/i, async (req, res) => {
        res.header('Content-Type', 'image/jpeg');
        res.send(await ShareManager.getFileIcon(req.params.filename));
    });
    server.get(/^\/(?<owner>.*)\/files(?:\/(?<filename>.*))?/i, async (req, res) => {
        const owner = shares.find(share => share.name === req.params.owner);
        if (!owner) return res.send('Owner doesnt exist');
        const files = await owner.listFiles(req.params.filename);
        res.header('Content-Type', 'text/html');
        res.send(generateFileList(files, false, owner.name));
    });
    server.get(/^\/(?<owner>.*)\/file\/(?<filename>.*)/i, async (req, res) => {
        const owner = shares.find(share => share.name === req.params.owner);
        if (!owner) return res.send('Owner doesnt exist');
        const [type, size, name, handle, stream] = await owner.openFileRead(req.params.filename, true);
        res.header('Content-Type', mime.lookup(name));
        res.header('Content-Length', size);
        stream.pipe(res);
        owner.closeFile(handle);
    });
    server.get(/^\/(?<owner>.*)\/icon\/(?<filename>.*)/i, async (req, res) => {
        const owner = shares.find(share => share.name === req.params.owner);
        if (!owner) return res.send('Owner doesnt exist');
        res.header('Content-Type', 'image/jpeg');
        res.send(await owner.getFileIcon(req.params.filename));
    });
    server.get(/^\/files(?:\/(?<filename>.*))?/i, async (req, res) => {
        const files = await ShareManager.listFiles(req.params.filename);
        res.header('Content-Type', 'text/html');
        res.send(generateFileList(files, true));
    });
}