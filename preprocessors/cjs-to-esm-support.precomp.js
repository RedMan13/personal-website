const path = require('path');

let imprtVar = 0;
let exprtVar = 0;
const captureRequired = /=\s*require\(["'`](.*?)["'`]\)/gi;
module.exports = async function(util) {
    // file is not a cjs module and so does not require any wrappings
    if (!/(module\.)?exports\s*=|require\(["'`].*?["'`]\)/gi.test(util.file)) return;
    const cjsImported = {};
    const cjsRequired = [];
    for (const [_, imp] of util.file.matchAll(captureRequired)) {
        cjsImported[imp] ??= `$_IMPORT_$_VARIABLE_$_${imprtVar++}_$`;
        cjsRequired.push([cjsImported[imp]]);
    }
    let cjsExport;
    try {
        cjsExport = require(util.path);
    } catch (err) {
        // oop, looks like we fucked up our check, abort loading
        if (err.message.includes('require() of ES')) return;
        throw err;
    }
    const hasDefault = typeof cjsExport !== 'object' || !!cjsExport[Symbol.hasInstance];
    const safeExporters = {};
    Object.keys(cjsExport).map(key => safeExporters[key] = `$_EXPORT_$_VARIABLE_$_${exprtVar++}_$`);

    util.file = `
    ${Object.entries(cjsImported)
        .map(([module, variable]) => `import * as ${variable} from "${module}"`)
        .join(';\n')}
    const exports = {};
    const module = { exports };
    ${util.file.replace(captureRequired, (imp) => `= ${cjsImported[imp]}`)}
    ${hasDefault 
        ? 'export default exports' 
        : `
            const { ${Object.entries(safeExporters)
                        .map(([key, safe]) => `"${key}": ${safe}`)
                        .join(', ')} } = module.exports;
            export { ${Object.entries(safeExporters)
                        .map(([key, safe]) => `${safe} as "${key}"`)
                        .join(', ')} }
        `}
    `;
}
module.exports.matchFile = util => util.matchType('js,cjs');