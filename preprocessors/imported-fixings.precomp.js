const { isMJS, toMJS, captures: { imported, exported }, resolveImport } = require('../builder/mjs-helpers');
const { jumpArbit } = require('../builder/js-helpers');
const path = require('path');
const fs = require('fs/promises');

const handled = {};
async function convertDeep(file, manager) {
    // dont infinitely recurse or rerun on seperate instance reasons
    if (handled[file]) return;
    handled[file] = true;
    console.log(`\t\t\tgetting imports from ${file.replace(manager.entry, '')}`);

    const [pathTo, data] = await manager.getFile(file).catch(() => []);
    if (!pathTo || !data) return;
    const isCJS = !isMJS(data);
    let imports = [];
    if (isCJS) {
        const [cjsImport, out] = await toMJS(file, data, manager);
        imports = cjsImport;
        await fs.writeFile(pathTo, out);
    } else {
        let out = '';
        for (let i = 0; i < data.length; i++) {
            const jmp = jumpArbit(data.slice(i));
            if (jmp) {
                out += data.slice(i, jmp +i);
                i += jmp -1;
                continue;
            }
            if (exported.exec(data.slice(i))?.index === 0) {
                out += data.slice(i);
                break;
            }
            const m = imported.exec(data.slice(i));
            if (m && m.index === 0) {
                const [isNode, relative, absolute] = await resolveImport(path.dirname(file), m.groups.module, manager);
                console.log(`\t\t\t\tfound import to ${relative}`)
                if (['.js', '.mjs', '.cjs'].includes(path.extname(relative)))
                    imports.push(absolute);
                out += m[1] + relative + m[3];
                i += m[0].length;
            }
            out += data[i];
        }
        await fs.writeFile(pathTo, out);
    }
    console.log('\t\t\tdone getting imports')
    console.log('\t\t\trunning on imports')
    for (const module of imports)
        await convertDeep(module, manager);
}
module.exports = async function(util) {
    for (const m of util.file.matchAll(/<script.*?type="module".*?>/gi)) {
        console.log('symbol')
        const src = m[0].match(/src="(.*?)"/i);
        if (!src) continue;
        const locPath = path.resolve(util.path, '..', src[1]);
        const [pathTo] = await util.getFile(locPath);
        util.replace(src.index + m.index +5, src.index + m.index + src[1].length +5, pathTo.replace(util.buildDir, ''));
        await convertDeep(locPath, util);
        for (const key in handled)
            delete handled[key];
    }
}
module.exports.matchFile = util => util.matchType('html,php');