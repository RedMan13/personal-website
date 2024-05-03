// note: i will be adding things to this as *i* need the, not as they may be needed
class PrecompUtils {
    constructor(path, opt_data) {
        this.path = path
        this.file = opt_data
    }
    tokenize(tokenCaptures, filterGroup) {
        let regex = ''
        let rules = 'g'
        const tokenNames = Object.keys(tokenCaptures)
        for (const [name, tokenReg] of Object.entries(tokenCaptures)) {
            for (const char of tokenReg.flags)
                if (!rules.includes(char)) rules += char
            regex += `|(?<${name}>${tokenReg.source})`
        }
        regex = new RegExp(regex.slice(1), rules)

        const tokens = []
        let groupChunk = []
        let groupName = 0
        for (const match of this.file.matchAll(regex)) {
            match.groups ??= {}
            const tokenName = tokenNames.find(name => match.groups[name])
            const token = {
                name: tokenName,
                start: match.index,
                end: match[0].length + match.index,
                idx: tokens.length,
                ...match.groups
            }
            if (!filterGroup) {
                tokens.push(token)
                continue
            }

            if (typeof filterGroup[groupName] === 'undefined') {
                tokens.push(groupChunk)
                groupChunk = []
                groupName = 0
            }
            // keep eating forward until we find the end tag (assuming there is one)
            if (filterGroup[groupName] === '*' && filterGroup[groupName +1] !== tokenName) {
                groupChunk.push(token)
                continue
            }
            // if we did find that end tag, then move forward past it
            if (filterGroup[groupName].at(-1) === '*' && filterGroup[groupName +1] === tokenName) {
                groupChunk.push(token)
                groupName += 2
                continue
            }
            
            const lengthAny = filterGroup[groupName].at(-1) === '*'
            const detaggedName = lengthAny
                ? filterGroup[groupName].slice(0, -1)
                : filterGroup[groupName]

            if (tokenName !== detaggedName) {
                groupChunk = []
                groupName = 0
                continue
            }
            if (tokenName === detaggedName) groupChunk.push(token)
            if (!lengthAny) groupName++
        }

        this.tokens = tokens
    }
    // cutout some piece of text from the file
    replace(start, end, str) {
        const left = this.file.slice(0, start)
        const right = this.file.slice(end)
        const ret = this.file.slice(start, end)
        this.file = left + str + right
        return ret
    }
    cutToken(idx) {
        const token = this.tokens[idx]
        delete this.tokens[idx]
        return this.cutout(token.start, token.end)
    }
    replaceToken(idx, newContent) {
        const token = this.tokens[idx]
        const left = this.file.slice(0, token.start)
        const right = this.file.slice(token.end)
        this.file = left + newContent + right
    }
    matchType(types) {
        const typeList = types
            .split(',')
            .map(type => type[0] === '.' ? type.slice(1) : type)
        const myType = this.path
            .split('.')
            .at(-1)
        return typeList.includes(myType)
    }
}

module.exports = PrecompUtils