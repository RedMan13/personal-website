const handleURL = require('./url-preprosesor.js');
console.log('creating expressjs server');
const { WebSocketExpress } = require('websocket-express');
const {runPHP} = require('builder');
const server = new WebSocketExpress();
const fs = require('fs');
 
fs.watch(__dirname, () => process.exit(0));
console.log('installing cors fuckawayer and request logger');
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
    next();
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
    
    res.sendFile(realPath);
})

console.log('finnalizing init');
server.listen(8000, () => console.log('yeayeayyeay im up im up'));