const { tokens, patterns } = require('./e4x-syntax');

module.exports = function(util) {
    if (!util.matchType('')) return true;
    util.tokenize(tokens);
    const groupsToXmlify = util.matchGroups(patterns);
    for (const group of groupsToXmlify) {
        
    }
}