const fs = require('fs/promises');
const path = require('path');
const rootDir = path.resolve('.');
// note: i will be adding things to this as *i* need them, not as they may be needed
class PrecompUtils {
    constructor(path, file) {
        this.path = path;
        this.file = file.toString('utf8');
        this.binnary = /[\x00\x1F]/gi.test(file);
        if (!this.binnary) {
            this.file = this.file.replaceAll(/\r?\n\r?/gi, '\n');
            this.makeLines();
        } else this.file = file;
        this.insertions = [];
    }
    makeLines() {
        let idx = 0;
        this.lines = this.file
            .split('\n')
            .map(line => {
                const lineIdx = idx;
                idx += line.length;
                return [lineIdx, line];
            });
    }
    tokenize(tokenCaptures, filterGroup) {
        let regex = ''
        const tokenNames = Object.keys(tokenCaptures)
        for (const [name, tokenReg] of Object.entries(tokenCaptures)) {
            regex += `|(?<${name}>${tokenReg.replaceAll('{o}', name)})`
        }
        regex = new RegExp(regex.slice(1), 'gui');

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
    getTokenRef(token) {
        const lineIdx = this.lines.findIndex(line => token.start < line[0]) -1;
        const line = this.lines[lineIdx];
        if (!line) return `${token.name} (unknown location)`;
        const col = token.start - line[0];
        return `${token.name} "${token[token.name]}" (at L${lineIdx +1}:C${col})`
    }

    insert(idx, str) {
        this.replace(idx, idx, str);
    }
    replace(start, end, str) {
        this.insertions.push({
            start,
            end,
            text: str
        });
    }
    matchType(types) {
        const typeList = types
            .split(',')
            .map(type => type[0] === '.' ? type : `.${type}`)
        return !!typeList.find(type => this.path.endsWith(type));
    }
    async bake(outputDir) {
        let offset = 0;
        for (const { start, end, text } of this.insertions) {
            const left = this.file.slice(0, start + offset);
            const right = this.file.slice(end + offset);
            this.file = left + text + right;
            offset += text.length - (end - start);
        }
        this.insertions = [];

        if (outputDir) {
            const name = this.path.replace(rootDir, '').slice(1);
            const baseName = path.basename(name);
            const endPath = path.resolve(outputDir, name);
            const folderPath = endPath.slice(0, -baseName.length);
            await fs.mkdir(folderPath, { recursive: true });
            await fs.writeFile(endPath, this.file);
        }
    }
}

module.exports = PrecompUtils