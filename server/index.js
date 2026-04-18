const handleURL = require('./url-preprosesor.js');
const ShareManager = require('./share-port.js');
console.log('creating expressjs server');
const { WebSocketExpress } = require('websocket-express');
const runPHP = require('./php-execute.js');
const read = require('body-parser/lib/read');
const cookieParser = require('cookie-parser');
const server = new WebSocketExpress();
const fs = require('fs');
const { handleReject, codes } = require('./handle-reject.js');
const mongoose = require('mongoose');
const UserManager = require('./user-manager.js');
const mime = require('mime');

server.use(cookieParser());
console.log(new Date().toUTCString());
const onces = {};
function once(ident, generator, override) {
    if (override) ident = override;
    if (ident in onces) return onces[ident];
    return onces[ident] = generator();
}
const storage = mongoose.createConnection(process.env.mdbUrl);
global.users = new UserManager(storage);
fs.watch('.', () => {
    console.log('server changed, killing my self for the new version to take place');
    process.exit(0);
});
// avoid crashing on failures, if we were to crash it could corrupt some shit like....... irreperably
process.on('uncaughtException', err => console.error(err));
process.on('unhandledRejection', err => console.error(err));
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
server.ws('/share-port', ShareManager.openSharePort);
server.useHTTP(async (req, res, next) => {
    const { username, password, loggingAllowed } = req.cookies;
    const agent = `${req.headers['user-agent']}, ${req.ips}`;
    if (loggingAllowed) users.logTraffic('load', req.path);
    if (username) users.logDeviceUsage(agent, username);
    if (username && password && await users.authorized(username, password)) res.header('Server-Timing', `authorized`);
    next();
})
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
})
console.log('installing cors fuckawayer, body parser, and request logger');
server.useHTTP((req, res, next) => {
    console.log(req.method, 'request to', req.path);
    // fuck cors
    // i fucking hate that cors is PERMANENTLY ENFORCED on webbrowsers making it so you HAVE to only use resources with cors systems
    // even shittier, most API's wont send cors headers and most static file hosts (github-pages and vercel to be specific) WONT LET YOU change the cors options for the webpage(s)
    // if i found a genie one of my first whishes would be "make cors nolonger enforced in browsers allowing content from none-cors compliant systems to be accessed"
    // what even is the point on cors? what the fuck does cors even do?, be an actual pain the mother fucking ass is all it does
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Referrer-Policy', 'unsafe-url');
    read(req, res, next, v => v, console.debug, {
        encoding: null,
        inflate: false,
        limit: 100000,
        verify: false
    });
})
console.log('setting up main file dealer');
server.useHTTP(handleURL);
// static file dealer
server.useHTTP(async (req, res) => {
    const {realPath, pathInfo} = req;
    if (pathInfo.ext === '.php') { 
        const scriptReturn = await runPHP(req, realPath);
        for (const [name, value] of scriptReturn.headers) 
            res.header(name, value);
        res.status(scriptReturn.status);
        res.send(scriptReturn.html);
        return;
    }
    if (realPath.endsWith('.server.js')) {
        try {
            require(realPath)(req, res, handleReject, codes, once.bind(null, realPath), storage, mongoose);
        } catch (err) {
            console.error(err);
            handleReject(codes.InternalServerError, `Could not generate content: ${err}`, res);
        }
        return;
    }
    
    res.sendFile(realPath);
})

console.log('finnalizing init');
server.listen(8000, () => console.log('yeayeayyeay im up im up'));
