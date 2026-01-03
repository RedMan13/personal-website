const path = require('path');
const fs = require('fs/promises');
const { handleFileError, getProtLevelOf, getProtection } = require('./file-utils.js');
const { handleReject, codes } = require('./handle-reject.js');
const RollingCache = require('./rolling-cache.js');

// compares two strings un-literally, only checking per keyword, ignoring keyword order while also keeping track of path order
// also ignoring file extensions such as .js, .html, .php, etc...
const cacheMultiplier = 2;
const altsCache = new RollingCache(0);
function compareFileNames(string, comp) {
    if (altsCache.get(string) === comp) return true;

    const folders = string.split('/');
    // definitly not a valid match, as it has no actual file
    if (folders.length <= 1 && !folders[1]) return false;
    const Cfolders = comp.split('/');
    // the order required clearly doesnt exist as they arnt the same number of folders
    if (folders.length !== Cfolders.length) return false;
    let isReal = true;
    for (const [idx, folder] of Object.entries(folders)) {
        const keywords = folder.split(/[^\w]+/ig);
        for (const keyword of keywords) {
            isReal &&= Cfolders[idx].includes(keyword);
            // exit early, failed to find a valid match
            if (!isReal) return false;
        }
    }
    return isReal;
}

const pathList = [];
let runningReads = 1;
let readyToHandle = false;
const closeRead = async () => {
    runningReads--;
    if (runningReads === 0) {
        console.log('finished reading directory structure', pathList);
        readyToHandle = true;
    }
}
const entry = path.resolve('./dist');
const readRecursive = async dir => {
    altsCache._cap += cacheMultiplier;
    console.log(path.relative(entry, dir));
    const files = await fs.readdir(dir).catch(err => err);
    // no directory at this path
    if (files.code === 'ENOTDIR') {
        await closeRead();
        pathList.push('/' + path.relative(entry, dir));
        return;
    }
    if (!Array.isArray(files)) throw files;
 
    // we do actually kinda need the folder to be in there on its own tho :Trol
    // pathList.push('/' + path.relative(entry, dir));
    for (const name of files) {
        const file = path.resolve(dir, name);
        // the path is pushed as a file if the path isnt a dir
        runningReads++;
        readRecursive(file);
    }
    await closeRead();
}
console.log('begining directory read');
readRecursive(entry);

// find the real file name according to some given name
// does things like replace dashes with spaces so you can use the url "main-page" instead of "main page.html"
function findRealName(name, ignoreIndex) {
    // root always has an index, so load that instead of looking for something that wont exist
    if (name === '/' && !ignoreIndex) return pathList.find(path => compareFileNames('/index', path));
    // server isnt ready!?!??!?!?!?!!?!?!?!!?!?!??!?!?! nah it chill this happens alot when in dev testing
    if (!readyToHandle) return name.endsWith(/\.\w+$/i) ? name : name + '.php';
    // if we never find the desired name then assume it just isnt in our list of names and give back the inputed name
    return pathList.find(path => compareFileNames(name, path)) ??
        (!ignoreIndex && pathList.find(path => compareFileNames(name + '/index', path))) ??
        name;
}

/**
 * @param {import('express').Request} req 
 * @param {import('express').Response} res
 */
module.exports = async function(req, res, next) {
    if (!readyToHandle)
        return handleReject(codes.ServiceUnavailable, 'Server unready to handle requests', res, true);
    // resolve twice, once to remove path escapes (., .. and such) and again to get the actual file path 
    const decodedPath = path.resolve(decodeURIComponent(req.path));
    if ('list' in req.query) {
        res.send(`
            <h1>List of files for ${decodedPath}</h1><br>
            <ul>
                ${(await fs.readdir(path.resolve(entry, `.${decodedPath}`))).map(file => `<li><a href="${file}">${file}</a></li>`)}
            </ul>
        `);
    }
    const realName = findRealName(decodedPath);
    const realPath = path.resolve(entry, `.${realName}`);
    const pathInfo = path.parse(realPath);
    const protectionLevel = getProtLevelOf(realPath, pathInfo);
    const info = await fs.stat(realPath).catch(handleFileError(res));
    if (!info) return;
    // if the path exists but isnt refrenced then drop a big ol four oh four
    if (!pathList.includes(realName)) 
        return handleReject(codes.NotFound, 'The requested file doesnt exist', res);
    console.log(info.isDirectory() ? 'folder' : 'file', realPath, 'requested');
    
    switch (protectionLevel) {
    // only protect the contained files from being read directly
    case 1:
        if (!getProtection.test(realPath) && !info.isDirectory())
            return res.send('nuh uh you arnt aloud to read these');
        break
    // protect the contents of the this file/folder from being read
    case 2:
        return res.send('nuh uh you arnt aloud to read this one specifically');
    // ensure this file can not be seen at all by the user-end
    case 3:
        // fake an error so that nothing is suspected of this issue
        // hey wait isnt this open source so they will see that the system does this
        // ehhhhhh im sure its fine since theycant view the filesystem without the server giving it to them
        return handleFileError(res)({code: 'ENOENT', path: realPath});
    }

    if (info.isDirectory())
        return handleReject(codes.NotAcceptable, 'Cannot read directory as file', res);

    req.realPath = realPath;
    req.pathInfo = pathInfo;
    req.protectionLevel = protectionLevel;
    
    next();
}