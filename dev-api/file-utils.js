const path = require('path')

const getProtection = /\.prot([1-3])/i
module.exports = {}
module.exports.getProtLevelOf = function getProtLevelOf(realPath) {
    return parseInt(realPath.match(getProtection)?.[1] ?? 0)
}

module.exports.handleFileError = function handleFileError(res) {
    return function(err) {
        console.log('an epic failure accured and has left the error', err)
        
        const filePath = path.parse(err.path)
        let errCode = 204
        let errMessage
        
        switch (err.code) {
        case 'ENOENT':
            errCode = 404
            errMessage = `file ${filePath.base} could not be found inside ${filePath.dir}`
            break
        case 'EACCES':
            errCode = 401
            errMessage = `access to ${filePath.base} is not in the servers permisions`
            break
        case 'ENOTDIR':
            errCode = 417
            errMessage = `expected ${err.path} to be a folder, but it was a file`
            break
        case 'EISDIR':
            errCode = 417
            errMessage = `expected ${err.path} to be a file, but it was a folder`
            break
        case 'ENAMETOOLONG':
            errCode = 406
            errMessage = `file name ${err.name} is too long`
            break
        }
        
        res.status(errCode)
        res.send(errMessage ?? `indeterminable error: ${err.code}`)
        return null
    }
}