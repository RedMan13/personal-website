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
const https = require('https');
const http = require('http');
const mime = require('mime');

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
server.useHTTP(async (req, res, next) => {
    const { username, password } = req.cookies;
    if (username && password && await users.authorize(username, password)) {
        res.header('Server-Timing', `authorized`);
        req.authorized = true;
    }
    next();
});

require('./share-port-rest.js')(server);
require('./user-manager-rest.js')(server);
server.get('/proxy', (req, res) => {
    (req.query.u.startsWith('https') ? https : http).get(req.query.u, req => {
        // this proxy is intended solely for image media
        // so, only mirror information that would be relevant to an image
        if (req.statusCode >= 300) 
            return handleReject(codes.MisdirectedRequest, 'This proxy is not for apis!! please only use for media, like images.', res, false);
        res.status(200);
        if ('content-type' in req.headers) res.header('Content-Type', req.headers['content-type']);
        if ('content-encoding' in req.headers) res.header('Content-Encoding', req.headers['content-encoding']);
        if ('content-length' in req.headers) res.header('Content-Length', req.headers['content-length']);
        req.pipe(res);
    }).on('error', e => { console.error(e); handleReject(codes['BadRequest'], e.message, res, false); });
});

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
