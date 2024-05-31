const nameStartChars = '_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿'
const nameChars = `${nameStartChars}.\\-·̀-ͯ‿-⁀`
const name = `[${nameStartChars}][${nameChars}]*`
const nsName = `(?<namespace>${name}:)?(?<realName>${name})`
const e4xTokens = {
    xmlOpen: `<!?\??${nsName}`,
    xmlAttrOpen: `\s+${nsName}(?<hasValue>=["{])?`,
    xmlTopClose: '>',
    xmlClose: `/>|</${nsName}>`
}
function filterTokens(util) {
    const blocks = []
    let block = []
    let lastToken = null
    for (const token of util.tokens) {
        // used for when we made a collection of data and need to now ignore all tokens that may have been collected
        if (token.start < lastToken.end) continue
        const caseName = lastToken 
            ? lastToken.name + '+' + token.name 
            : token.name
        let valid = false
        switch (caseName) {
        // dont do anything, already valid
        case 'xmlOpen': valid = true; break;
        case 'xmlAttrOpen+xmlAttrOpen':
        case 'xmlOpen+xmlAttrOpen': {
            if (!token.hasValue) {
                token.value = true
                break
            }
            const isJsEval = token.hasValue[1] === '{'
            const endChar = token.hasValue[1] === '{'
                '}'
                '"'
            let attrVal = ''
            let inEscape = false
            let idx = token.end
            while (true) {
                
            }
            token.end = idx
            token.value = attrVal
            token.isJsEval = isJsEval
            valid = true
            break
        }
        case 'xmlAttrOpen+xmlTopClose':
        case 'xmlOpen+xmlTopClose': valid = true; break;
        }
        if (valid) {
            block.push(token)
            lastToken = token
        } else {
            block = []
            lastToken = null
        }
    }
}
module.exports = function(util) {return true}