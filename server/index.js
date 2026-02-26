const handleURL = require('./url-preprosesor.js');
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
console.log('installing cors fuckawayer, body parser, and request logger');
server.useHTTP((req, res, next) => {
    // console.log(req, res)
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