const PrecompUtils = require('../builder/precomp-utils');

module.exports = async function(util) {
    util.tokenize({
        open: '<script',
        // use file="fileType" syntax to define a script to be treated as if it was this file
        file: '\\s+file="(?<fileType>[^"]+)',
        scriptSrc: '\\s+src="[^"]+"', // this only exists to cause exclusion via the filter group
        endAttrs: '>',
        close: '</script>'
    }, ['open', 'file', 'endAttrs', '*', 'close']);
    for (const tokens of util.tokens) {
        const fileType = tokens[1].fileType
        
        const endAttrs = tokens.find(token => token.name === 'endAttrs')
        const codeStart = endAttrs.end
        const codeEnd = tokens.at(-1).start
        const code = util.file.slice(codeStart, codeEnd)
        
        console.log(`\t\tinner script at L${util.findLine(codeStart)[2]} with file type ${fileType}`)
        const tmpUtil = new PrecompUtils(`./tmp.${fileType}`, code, util.manager);
        for (const precomp of util.manager.precomps) {
            if (!precomp.matchFile(tmpUtil)) continue;
            try {
                console.log('\t\t\tappyling precomp to inner script', precomp.title)
                await precomp(tmpUtil);
            } finally {
                tmpUtil.bake();
            }
        }
        util.replace(codeStart, codeEnd, tmpUtil.file);
    }
}
module.exports.matchFile = util => util.matchType('php,html');