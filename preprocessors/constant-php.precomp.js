const path = require('path');
const {runPHP} = require('builder');

const fakeReq = {
    pause() {},
    pipe() {},
    resume() {},
    originalUrl: '',
    protocol: 'http',
    method: 'GET',
    hostname: 'localhost:8080',
    get() { return ''; },
    headers: {}
};
module.exports = async function(util) {
    fakeReq.path = util.path;
    let destPath = util.path.replace('.const.php', '');
    if (path.extname(destPath).length <= 1) destPath += '.html'
    util.file = (await runPHP(fakeReq, util.path)).html;
    util.path = destPath;
};
module.exports.matchFile = util => util.matchType('.const.php');
module.exports.weight = Infinity;