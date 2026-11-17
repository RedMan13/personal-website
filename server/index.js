const handleURL = require('./url-preprosesor.js');
console.log('creating expressjs server');
const { WebSocketExpress } = require('websocket-express');
const runPHP = require('./php-execute.js');
const read = require('body-parser/lib/read');
const cookieParser = require('cookie-parser');
const server = new WebSocketExpress();
const fs = require('fs');
const { handleReject, codes } = require('./handle-reject.js');
const mongoose = require('mongoose');
const UserManager = require('./user-manager/core.js');

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

server.use(cookieParser());
console.log('installing cors fuckawayer, body parser, and request logger');
server.useHTTP((req, res, next) => {
    console.log(req.method, 'request to', req.path);

    read(req, res, next, v => v, console.debug, {
        encoding: null,
        inflate: false,
        limit: 100000,
        verify: false,
        skipCharset: true,
        shouldParse: () => true
    });
});
server.use(async (req, res, next) => {
    const { token } = req.cookies;
    console.log(req.ip);
    const username = await users.checkToken(token, req.ip);
    if (username) {
        res.header('Server-Timing', `authorized, username;desc=${username}`);
        req.authorized = true;
        req.username = username;
    }
    next();
});

require('./share-port-rest.js')(server);
require('./user-manager-rest.js')(server);

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
