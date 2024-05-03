const path = require('path')
const fs = require('fs/promises')
const appendAccounts = require('./account-system.js')
const runPHP = require('./php-runner.js')
const handleURL = require('./url-preprosesor')
const {handleFileError, getProtLevelOf} = require('./file-utils.js')
console.log('creating expressjs server')
const { WebSocketExpress } = require('websocket-express');
const server = new WebSocketExpress()
    
const isDevBuild = true
let random = Date.now()
function genRandom() {
    random = parseInt(Math.random().toString().split('.')[1])
    
    return random
}

console.log('installing cors fuckawayer and request logger')
server.useHTTP((req, res, next) => {
    // console.log(req, res)
    console.log(req.ip, 'made a', req.method, 'request to the path', req.path)
    // fuck cors
    // i fucking hate that cors is PERMANENTLY ENFORCED on webbrowsers making it so you HAVE to only use resources with cors systems
    // even shittier, most API's wont send cors headers and most static file hosts (github-pages and vercel to be specific) WONT LET YOU change the cors options for the webpage(s)
    // if i found a genie one of my first whishes would be "make cors nolonger enforced in browsers allowing content from none-cors compliant systems to be accessed"
    res.header('Access-Control-Allow-Origin', '*')
    next()
})
console.log('setting up main file dealer')
server.useHTTP(handleURL)
// static file dealer
server.useHTTP(async (req, res) => {
    const {realPath, pathInfo} = req
    if (pathInfo.ext === '.php' && !('viewSource' in req.query)) {
        const scriptReturn = await runPHP(req, realPath)
        for (const [name, value] of scriptReturn.headers) 
            res.header(name, value)
        res.status(scriptReturn.status)
        res.send(scriptReturn.html)
        return
    }
    
    res.sendFile(realPath)
})
appendAccounts(server)

console.log('finnalizing init')
server.listen(8000, () => console.log('yeayeayyeay im up im up'))