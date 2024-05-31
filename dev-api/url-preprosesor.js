const path = require('path')
const fs = require('fs/promises')
const crypto = require('crypto')
const PrecompUtils = require('./precomp-utils.js')
const {handleFileError, getProtLevelOf} = require('./file-utils.js')
const RollingCache = require('./rolling-cache.js')

// compares two strings un-literally, only checking per keyword, ignoring keyword order while also keeping track of path order
// also ignoring file extensions such as .js, .html, .php, etc...
const cacheMultiplier = 2
const altsCache = new RollingCache(0)
function compareFileNames(string, comp) {
    if (altsCache.get(string) === comp) return true

    const folders = string.split('/')
    const Cfolders = comp.split('/')
    // the order required clearly doesnt exist as they arnt the same number of folders
    if (folders.length !== Cfolders.length) return false
    let isReal = true
    for (const [idx, folder] of Object.entries(folders)) {
        const keywords = folder.split(/[^\w.]+/ig)
        for (const keyword of keywords) {
            isReal &&= Cfolders[idx].includes(folder)
            // exit early, failed to find a valid match
            if (!isReal) return false
        }
    }
    return isReal
}

const ignoredFiles = ['node_modules', 'useless-history', 'builds', '.git']
const pathList = []
const precompFiles = []
const precomps = {}
let runningReads = 1
let readyToHandle = false
const closeRead = async () => {
    runningReads--
    if (runningReads === 0) {
        await fs.rm('./builds', { recursive: true })
        await fs.mkdir('./builds')
        console.log('finished reading directory structure', pathList, precompFiles)
        for (const file of pathList) {
            // skip directories
            if (file.endsWith('/')) continue
            const realPath = path.resolve(`..${file}`)
            const sourceFile = await fs.readFile(realPath, 'utf8')
            const util = new PrecompUtils(realPath, sourceFile)
            let neverRan = true
            for (const precomp of precompFiles) {
                const didntRun = await precomp(util)
                neverRan &&= didntRun
                if (!didntRun)
                    console.log('ran precomp', precomp._name, 'on file', file)
            }
            if (!neverRan) {
                const fileType = file.split('.').at(-1)
                const hash = (parseInt(Math.random().toString().split('.')[1]) * (Math.random() * 100)).toString(36)
                const newPath = path.resolve(`./builds/${hash}.${fileType}`)
                await fs.writeFile(newPath, util.file)
                precomps[realPath] = newPath
            }
        }
        readyToHandle = true
    }
}
const readRecursive = async dir => {
    altsCache._cap += cacheMultiplier
    console.log(dir)
    const files = await fs.readdir(`..${dir}`).catch(err => err)
    // no directory at this path
    if (files.code === 'ENOTDIR') {
        await closeRead()
        pathList.push(dir.slice(0, -1))
        return
    }
 
    // we do actually kinda need the folder to be in there on its own tho :Trol
    pathList.push(dir)
    for (const name of files) {
        if (ignoredFiles.includes(name)) continue
        const file = `${dir}${name}/`
        // precomps need to be loaded seperatly so we know they exist and can add matches for them differently
        // precomps shouldnt be added to the main list as they have nothing to do with the file server
        if (name.endsWith('.precomp.js')) {
            const precomp = require('..' + file.slice(0, -1))
            precomp._name = name
            precompFiles.push(precomp)
            continue
        }
        // the path is pushed as a file if the path isnt a dir
        runningReads++
        readRecursive(file)
    }
    await closeRead()
}
console.log('begining directory read')
readRecursive('/')

const mainFileAlts = [
    '',
    'main',
    'index',
    'main-page',
    'main_page',
    'main page',
    'index-page',
    'index_page',
    'index page'
]
// find the real file name according to some given name
// does things like replace dashes with spaces so you can use the url "main-page" instead of "main page.html"
function findRealName(name) {
    const nameData = path.parse(name)
    let nameModifier = 0b00000000
    if (mainFileAlts.includes(nameData.name)) return '/index.php'
    // server isnt ready!?!??!?!?!?!!?!?!?!!?!?!??!?!?! nah it chill this happens alot when in dev testing
    if (!readyToHandle) return name.endsWith(/\.\w+$/i) ? name : name + '.php'
    // if we never find the desired name then assume it just isnt in our list of names and give back the inputed name
    return pathList.find(path => compareFileNames(name, path)) ?? name
}

module.exports = async function(req, res, next) {
    if (!readyToHandle) {
        res.status(425)
        res.send('server unready to handle requests')
        return
    }
    // resolve twice, once to remove path escapes (., .. and such) and again to get the actual file path 
    const decodedPath = path.resolve(decodeURIComponent(req.path))
    const realPath = path.resolve(`..${findRealName(decodedPath)}`)
    const pathInfo = path.parse(realPath)
    const protectionLevel = getProtLevelOf(realPath, pathInfo)
    const info = await fs.stat(realPath).catch(handleFileError(res))
    if (!info && pathList.includes(decodedPath)) {
        res.status(410)
        res.send('file existed but can nolonger be found')
        return
    }
    if (!info) return
    // if the path exists but isnt refrenced then refrence it
    if (!pathList.includes(decodedPath)) pathList.push(decodedPath)
    console.log(info.isDirectory() ? 'folder' : 'file', realPath, 'requested by', req.ip)
    
    switch (protectionLevel) {
    // only protect the contained files from being read directly
    case 1:
        if (!getProtection.test(realPath) && !info.isDirectory())
            return res.send('nuh uh you arnt aloud to read these')
        break
    // protect the contents of the this file/folder from being read
    case 2:
        return res.send('nuh uh you arnt aloud to read this one specifically')
    // ensure this file can not be seen at all by the user-end
    case 3:
        // fake an error so that nothing is suspected of this issue
        // hey wait isnt this open source so they will see that the system does this
        // ehhhhhh im sure its fine since theycant view the filesystem without the server giving it to them
        return handleFileError(res)({code: 'ENOENT', path: realPath})
    }

    if (info.isDirectory()) {
        res.status(505)
        res.send('cannot read directory as file')
        return
    }

    req.realPath = realPath
    req.pathInfo = pathInfo
    req.protectionLevel = protectionLevel
    if (precomps[realPath]) {
        console.log(precomps[realPath])
        req.realPath = precomps[realPath]
        req.pathInfo = path.parse(precomps[realPath])
    }
    
    next()
}