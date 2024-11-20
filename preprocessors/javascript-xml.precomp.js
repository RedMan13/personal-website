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

function comprehendTokens(list) {
    if (!Array.isArray(list)) return list;
    const innerEnd = list.at(-1).match === '/>'
        ? list.length -1
        : list.findIndex(item => 
            item?.match?.slice?.(-1) === '>') +1;
    const children = [];
    let brace = 0;
    let start = null;
    let manyChunk = false;
    for (let part of list.slice(innerEnd, -1)) {
        // forceably discard any other inner matches 
        if (part.name) part = part.match;
        if (typeof part === 'string') {
            for (let i = 0; i < part.length; i++) {
                const jump = part.slice(i).match(jumpover)?.[0]?.length;
                if (jump) {
                    i += jump -1;
                    continue;
                }
                if (part[i] === '{') {
                    if (brace === 0) {
                        start = i;
                    }
                    brace++;
                }
                if (part[i] === '}') {
                    brace--;
                    if (brace === 0 && manyChunk) {
                        children.at(-1).push(part.slice(0, i));
                        children.push(part.slice(i +1));
                        manyChunk = false;
                        continue;
                    }
                    if (brace === 0) {
                        children.push(
                            part.slice(0, start), 
                            [part.slice(start +1, i)], 
                            part.slice(i +1)
                        );
                    }
                }
            }
            if (brace !== 0) {
                manyChunk = true;
                children.push(part.slice(0, start), [part.slice(start +1)]);
            }
            continue;
        }
        if (manyChunk) {
            children.at(-1).push(part);
            continue;
        }
        children.push(part);
    }
    return {
        start: list[0].start,
        end: list.at(-1).end,
        isCustom: isUppercase(list[0].tagname[0]),
        tagname: list[0].tagname,
        attributes: list.slice(1, innerEnd)
            .map(({ keyname, atval }) => [
                keyname, 
                atval 
                    ? atval[0] === '{' 
                        ? atval.slice(1, -1) 
                        : JSON.stringify(atval.slice(1, -1))
                    : '""'
            ]),
        children
    }
}
let defineVar = 0;
module.exports = function(util) {
    if (util.matchType('.js') && !globalThis.isBuild)
        return util.file = util.file.replaceAll('.jsx', '.js');
    util.tokenize({
        // a list of all area blocks that we must ignore the contents of
        _: jumpover.source.slice(4, -1),
        xmlStart: `<\\s*(?<tagname>${varKey})\\s*>?`,
        strEscape,
        xmlEnd: `(?:<\\s*\\/(?<endname>${varKey})\\s*|\\/)>`,
        attribute: `(?<keyname>${varKey})(?:\\s*=\\s*(?<atval>"(?:[^"]|\\\\")*"|'(?:[^']|\\\\')*'|(\\{.*?\\})))?(?:\\s*(?:(?=/>)|>)|\\s+(?=[a-z_]))`,
    });
    const alls = [];
    const layers = [alls];
    for (const tok of util.tokens) {
        const last = Array.isArray(layers.at(-1).at(-1))
            ? layers.at(-1).at(-1).at(-1)
            : layers.at(-1).at(-1);
        if (tok.name === 'xmlStart') {
            const layer = [tok];
            if (last?.end) layers.at(-1).push(util.file.slice(last.end, tok.start));
            layers.push(layer);
        }
        if (tok.name === 'attribute' && 
              layers.at(-1).at(-1) &&
              (layers.at(-1).at(-1).name === 'xmlStart' || 
               layers.at(-1).at(-1).name === 'attribute') &&
              last?.match?.slice?.(-1) !== '>') {
            layers.at(-1).push(tok);
        }
        if (tok.name === 'xmlEnd' && layers.at(-1)?.[0]?.name === 'xmlStart') {
            if (last?.end && tok.match !== '/>') 
                layers.at(-1).push(util.file.slice(last.end, tok.start));
            if (tok.match !== '/>' && tok.endname !== layers.at(-1)[0].tagname)
                throw new SyntaxError(`Invalid xml structure. ended xml block with ${tok.endname}, expected ${layers.at(-1)[0].tagname}`)
            const me = layers.pop();
            me.push(tok);
            layers.at(-1).push(comprehendTokens(me));
        }
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