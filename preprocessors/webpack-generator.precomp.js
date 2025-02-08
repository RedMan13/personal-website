const { isMJS, resolveImport } = require('../builder/mjs-helpers');
const { toCJS, getCJSRequired } = require('../builder/js-helpers');
const mime = require('mime');
const path = require('path');

const handled = {};
async function getDeepFiles(file, manager, props) {
    if (handled[file]) return;
    handled[file] = true;
    
    let data = (await manager.getFile(file))[1];
    let out = [[file, data]];
    switch (props.type.toLowerCase()) {
    case 'apng':
    case 'avif':
    case 'gif':
    case 'jpeg':
    case 'png':
    case 'svg':
    case 'webp':
        data = `module.exports = new Image(); module.exports.src = "data:${mime.lookup(props.type)};base64;${JSON.stringify(Buffer.from(data).toString('base64')).slice(1, -1)}";`;
        break;
    case 'html':
        data = `module.exports = parseHTMLUnsafe(${JSON.stringify(data)});`;
        break;
    case 'xml':
        data = `const parser = new DOMParser(); module.exports = parser.parseFromString(${JSON.stringify(data)}, "text/xml");`;
        break;
    case 'txt':
        data = `module.exports = ${JSON.stringify(data)};`;
        break;
    case 'css':
        data = `module.exports = new CSSStyleSheet(); module.exports.replaceSync(${JSON.stringify(data)});`;
        break;
    case 'json':
        data = `module.exports = JSON.parse(${JSON.stringify(data)});`;
        break;
    default:
    case 'js':
    case 'mjs':
    case 'cjs': {
        let imports;
        if (isMJS(data))
            [imports, data] = toCJS(data);
        else
            imports = getCJSRequired(data);
        for (const [imported, props] of imports) {
            const real = (await resolveImport(path.dirname(file), imported, manager))[2];
            props.type ||= path.extname(real).slice(1);
            const datas = await getDeepFiles(real, manager, props);
            if (!datas) continue;
            out = out.concat(datas);
        }
        break;
    }
    }
    return out;
}
module.exports = async function(util) {
    for (const m of util.file.matchAll(/<script.*?>/gi)) {
        const src = m[0].match(/src="(.*?)"/i);
        if (!src) continue;
        const locPath = (await resolveImport(path.dirname(util.path), src[1], util))[2];
        const files = await getDeepFiles(locPath, util, { type: 'js' });
        let jsGen = 'const files = {';
        for (const [file, data] of files) {
            jsGen += JSON.stringify(path.relative(util.entry, JSON.stringify(file)));
            jsGen += '(module,exports,require) {';
            jsGen += data;
            jsGen += '},';
        }
        jsGen += '};';
        jsGen += `
        class ImportError extends Error {}
        const validExts = ['.js', '.mjs', '.cjs', '.json'];
        function genReq(root) {
            return function require(file) {
                let path = root.split('/');
                const instructs = file.split('/');
                for (const inst of instructs) {
                    switch (inst) {
                    case '.': break;
                    case '..': 
                        if (path.at(-1) === '..' || path.length <= 0)
                            path.push('..');
                        else 
                            path.pop(); 
                        break;
                    default: path.push(inst); break;
                    }
                }
                file = path.join('/');
                let triedExt = 0;
                while (!(path in files)) {
                    if (path[0] === 'index' && !validExts[triedExt]) 
                        throw new ImportError(\`Could not locate a module at \${path.slice(0, -1).join('/')} from \${root}\`);
                    if (!validExts[triedExt]) { path.push('index'); triedExt = 0; }
                    file = path.join('/');
                    file += validExts[triedExt++];
                }
                const exports = {};
                files[file]({ exports }, exports, require);
                return exports;
            }
        }
        genReq('.')(${path.relative(util.entry, locPath)});
        `;
        util.replace(src.index + m.index, src.index + m.index + src[0].length, `>${jsGen}</script`);
        for (const key in handled)
            delete handled[key];
    }
}
module.exports.matchFile = util => util.matchType('html,php');