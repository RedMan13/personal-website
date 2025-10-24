const path = require('path');

/** @param {import('builder').PrecompUtils} util */
module.exports = async function(util) {
    const match = util.file.match(/<head.*?>/);
    const meta = `<meta id="site-distributed" content="${path.relative(util.entry, util.path)}">`;
    util.insert(match.index + match[0].length, meta);
};
module.exports.matchFile = util => util.matchType('html,php,ejs');
module.exports.weight = -Infinity;