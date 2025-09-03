const path = require('path');
const { handleReject, codes } = require('./handle-reject.js');

const getProtection = /\.prot([1-3])/i;
function getProtLevelOf(realPath) {
    return parseInt(realPath.match(getProtection)?.[1] ?? 0);
}
function handleFileError(res) {
    return function(err) {
        console.log('an epic failure accured and has left the error', err);
        
        const filePath = path.parse(path.relative(path.resolve('.'), err.path));
        let errCode = codes.BadRequest;
        let errMessage;
        
        switch (err.code) {
        case 'ENOENT':
            errCode = codes.NotFound;
            errMessage = `File ${filePath.base} could not be found inside ${filePath.dir}`;
            break;
        case 'EACCES':
            errCode = codes.Unauthorized;
            errMessage = `Access to ${filePath.base} is not in the servers permisions`;
            break;
        case 'ENOTDIR':
            errCode = codes.NotAcceptable;
            errMessage = `Expected ${err.path} to be a folder, but it was a file`;
            break;
        case 'EISDIR':
            errCode = codes.NotAcceptable;
            errMessage = `Expected ${err.path} to be a file, but it was a folder`;
            break;
        case 'ENAMETOOLONG':
            errCode = codes.NotAcceptable;
            errMessage = `File name ${err.name} is too long`;
            break;
        }
        
        handleReject(errCode, errMessage ?? `indeterminable error: ${err.code}`, res);
    }
}
module.exports = { getProtLevelOf, handleFileError, getProtection };