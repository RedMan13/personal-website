const handleURL = require('./url-preprosesor.js');
const ShareManager = require('./share-port.js');
console.log('creating expressjs server');
const { WebSocketExpress } = require('websocket-express');
const runPHP = require('./php-execute.js');
const read = require('body-parser/lib/read');
const server = new WebSocketExpress();
const fs = require('fs');
const { handleReject, codes } = require('./handle-reject.js');
const mongoose = require('mongoose');
  
console.log(new Date().toUTCString());
const onces = {};
function once(ident, generator, override) {
    if (override) ident = override;
    if (ident in onces) return onces[ident];
    return onces[ident] = generator();
}
const storage = mongoose.createConnection(process.env.mdbUrl);
fs.watch('.', () => {
    console.log('server changed, killing my self for the new version to take place');
    process.exit(0);
});
// avoid crashing on failures, if we were to crash it could corrupt some shit like....... irreperably
process.on('uncaughtException', err => console.error(err));
process.on('unhandledRejection', err => console.error(err));
function escape(str) {
    return str.replace(/[<>&'"]/g, c => {
        switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        }
    });
}
server.ws('/share-port', ShareManager.openSharePort);
server.get('/file/:filename', async (req, res) => {
    const [share, size, name, handle] = await ShareManager.openFileRead(req.params.filename);
    res.header('Content-Length', size);
    let chunk;
    while (chunk = await share.readChunk(handle).catch(() => null)) res.write(chunk);
    res.end();
    share.closeFile(handle);
});
server.get('/:owner/files/:filename', async (req, res) => {
    const owner = shares.find(share => share.name === req.params.owner);
    const files = await owner.listFiles(req.params.filename);
    res.header('Content-Type', 'text/html');
    res.send(`
        <table style="width: 100%;">
            <thead>
                <tr style="background-color: grey;">
                    <th scope="col">Name</th>
                    <th scope="col">Owner</th>
                    <th scope="col" style="width: 200px">Date</th>
                    <th scope="col" style="width: 0px">Size</th>
                </tr>
            </thead>
            <tbody>
                ${files.map(file => `<tr>
                    <td style="background-color: #aFaFaF;"><a href="/${escape(file.owner)}/file/${escape(file.name)}">${escape(file.name)}</a></td>
                    <td style="background-color: #aFaFaF;">${escape(file.owner)}</td>
                    <td style="background-color: #aFaFaF;">${new Date(file.date).toLocaleString()}</td>
                    <td style="background-color: #aFaFaF;">${(() => {
                        if (file.size / 1000_000_000_000 >= 1) return `${(file.size / 1000_000_000_000).toFixed(2)}TB`;
                        if (file.size / 1000_000_000 >= 1) return `${(file.size / 1000_000_000).toFixed(2)}GB`;
                        if (file.size / 1000_000 >= 1) return `${(file.size / 1000_000).toFixed(2)}MB`;
                        if (file.size / 1000 >= 1) return `${(file.size / 1000).toFixed(2)}KB`;
                        return `${file.size}B`;
                    })()}</td>
                </tr>`)}
            </tbody>
        </table>    
    `);
});
server.get('/:owner/file/:filename', async (req, res) => {
    const owner = shares.find(share => share.name === req.params.owner);
    const [type, size, name, handle] = await owner.openFileRead(req.params.filename);
    res.header('Content-Length', size);
    let chunk;
    while (chunk = await owner.readChunk(handle).catch(() => null)) res.write(chunk);
    res.end();
    owner.closeFile(handle);
});
server.get('/files/:filename', async (req, res) => {
    const files = await ShareManager.listFiles(req.params.filename);
    res.header('Content-Type', 'text/html');
    res.send(`
        <table style="width: 100%;">
            <thead>
                <tr style="background-color: grey;">
                    <th scope="col">Name</th>
                    <th scope="col">Owner</th>
                    <th scope="col" style="width: 200px">Date</th>
                    <th scope="col" style="width: 0px">Size</th>
                </tr>
            </thead>
            <tbody>
                ${files.map(file => `<tr>
                    <td style="background-color: #aFaFaF;"><a href="/${escape(file.owner)}/file/${escape(file.name)}">${escape(file.name)}</a></td>
                    <td style="background-color: #aFaFaF;">${escape(file.owner)}</td>
                    <td style="background-color: #aFaFaF;">${new Date(file.date).toLocaleString()}</td>
                    <td style="background-color: #aFaFaF;">${(() => {
                        if (file.size / 1000_000_000_000 >= 1) return `${(file.size / 1000_000_000_000).toFixed(2)}TB`;
                        if (file.size / 1000_000_000 >= 1) return `${(file.size / 1000_000_000).toFixed(2)}GB`;
                        if (file.size / 1000_000 >= 1) return `${(file.size / 1000_000).toFixed(2)}MB`;
                        if (file.size / 1000 >= 1) return `${(file.size / 1000).toFixed(2)}KB`;
                        return `${file.size}B`;
                    })()}</td>
                </tr>`)}
            </tbody>
        </table>    
    `);
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