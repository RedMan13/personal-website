const varKey = '[a-z_$][a-z0-9_$-]*';
const strEscape = '\\\\(?:.|x[0-9a-f]{2}|u[0-9a-f]{4})';
const jumpover = /^(?:\/\/.*?\n|\/\*.*?\*\/|"(?:[^"\n]|\\")*"|'(?:[^'\n]|\\')*'|`(?:[^`]|\\`)*`)/

function isUppercase(tag) {
    return 'QWERTYUIOPASDFGHJKLZXCVBNM'.includes(tag[0]);
}
function fixCustom(tag) {
    const split = [...tag]
        .reduce((cur, val) => {
            if (isUppercase(val)) 
                cur.push([val.toLowerCase()]);
            else 
                cur.at(-1).push(val);

            return cur;
        }, []);
    if (split.length < 2) 
        throw new SyntaxError('ALL custom elements MUST be able to consist of atleast two strings seperated by a dash')
    return split.map(list => list.join('')).join('-');
}
/**
 * @param {Object|Array} outer 
 * @param {string?} parent 
 * @returns {string}
 */
const genDeep = (outer, parent) => {
    let isAsync = false;
    const isArray = Array.isArray(outer);
    const children = isArray ? outer : outer.children;
    console.log(outer);
    const elVar = isArray 
        ? parent 
        : `$REACT_ELEMENT_${++defineVar}`;
    let out = '';
    if (!isArray) {
        out += `const ${elVar} = `;
        out += !outer.isCustom
            ? `document.createElement("${outer.tagname}");`
            : `new ${outer.tagname}();`
        for (const [key, value] of outer.attributes) {
            if (!'\'"'.includes(value[0]))
                isAsync ||= /await\s+/g.test(value);
            out += key.startsWith('on')
                ? `${elVar}.addEventListener("${key}", ${value});`
                : `${elVar}.setAttribute("${key}", ${value});`;
        };
    }
    for (const child of children) {
        if (typeof child === 'string') {
            out += `${elVar}.appendChild(document.createTextNode(${JSON.stringify(child)}));`;
            continue;
        }
        if (Array.isArray(child)) {
            let toCheck = `appendChildren(${elVar}, [`;
            for (const part of child) {
                if (typeof part === 'string') {
                    toCheck += part;
                    continue;
                }
                toCheck += genDeep(part);
            }
            toCheck += ']);';
            out += toCheck;
            isAsync ||= /await\s+/g.test(toCheck);
            continue;
        }
        const toCheck = genDeep(child, elVar);
        out += toCheck;
        isAsync ||= toCheck.startsWith('(await');
    }
    if (isArray) return out;
    if (parent)
        out += `${parent}.appendChild(${elVar});`;
    else
        out += `return ${elVar};`
    return parent 
        ? out
        : isAsync
            ? `(await (async () => {${out}})())`
            : `(() => {${out}})()`;
}

let defineVar = 0;
module.exports = async function(util) {
    if (util.matchType('.js') && !globalThis.isBuild)
        return util.file = util.file.replaceAll('.jsx', '.js');

    const layers = [];
    for (let i = 0; i < util.file.length; i++) {
        const char = util.file[i];
        const self = layers.at(-1);
        if (!self) continue;
        switch (char) {
        case '<': 
            layers.push({
                reading: 'tagname',
                res: {
                    tagname: '',
                    isCustom: false,
                    attributes: [],
                    children: []
                }
            }); 
            break;
        default: 
            switch (self.reading) {
            case 'tagname':
                if (/[^a-z0-9\-_$]/i.test(char)) {
                    self.reading = 'attributes';
                    self.res.isCustom = /[A-Z][a-z]|[a-z]-/gi.test(self.res.tagname);
                    break;
                }
                self.res.tagname += char;
                break;
            }
        }
    }
    
    for (const usage of alls.filter(mabyString => typeof mabyString !== 'string')) {
        const line = util.findLine(usage.start);
        const indent = line[1].match(/^\s*/)[0].length / 4;
        if (usage.tagname === 'define') {
            const varName = line[1].match(/(?:(?:const|let|var)\s*)?([_$a-zA-Z][_$a-zA-Z0-9]*)\s*=\s*/)?.[1];
            if (!varName)
                throw new SyntaxError(`${util.getTokenRef({ name: 'Element', start: usage.start })} definition shorthands MUST be contained within a variable decleration`);
            const gen = genDeep(usage.children, 'shadowDom');
            const attributes = `{\n${'    '.repeat(indent +1)}${
                usage.attributes
                    .map(([key, value]) => `"${key}": ${value}`)
                    .join(',\n' + '    '.repeat(indent +1))
            }\n${'    '.repeat(indent)}}`;
            util.replace(usage.start, usage.end, `defineElement("${fixCustom(varName ?? 'TempFix')}", ${attributes}, (async function(shadowDom) {${gen}}));`)
            continue;
        }
        const gen = genDeep(usage, null, indent +1);
        util.replace(usage.start, usage.end, gen);
    }
    util.path = util.path.replace(/jsx$/i, 'js');
}
module.exports.matchFile = util => util.matchType('.jsx,js');