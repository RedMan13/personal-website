const path = require('path');

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {(code: number, message: string, res: import('express').Response, retry: boolean) => void} reject 
 * @param {{ [key: string]: number }} codes 
 */
module.exports = function(req, res, reject, codes) {
    res.sendFile(path.resolve('../logs/error.log'));
}