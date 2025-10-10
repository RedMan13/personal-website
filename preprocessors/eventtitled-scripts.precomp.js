module.exports = async function(util) {
    let didThings = false
    util.tokenize({
        open: /^<script/i,
        // use either event="evname" syntax or onevname syntax
        eventName: /^\s+(event="|on)(?<event>[a-z]+)/i,
        scriptSrc: /^\s+src="[^"]+"/i, // this only exists to cause exclusion via the filter group
        endAttrs: /^>/,
        close: /^<\/script>/i
    }, ['open', 'eventName', 'endAttrs', '*', 'close']);
    for (const tokens of util.tokens) {
        const event = tokens[1].event
        
        const endAttrs = tokens.find(token => token.name === 'endAttrs')
        const codeStart = endAttrs.end
        const codeEnd = tokens.at(-1).start
        const code = util.file.slice(codeStart, codeEnd)
        
        util.replace(codeStart, codeEnd, `window.addEventListener("${event}", async (ev) => {${code}})`)
        didThings = true
    }
    return !didThings
}
module.exports.matchFile = util => util.matchType('php,html,ejs');
module.exports.weight = 5;