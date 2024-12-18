const path = require('path');
const fs = require('fs/promises')

let packages = null;
module.exports = async function(util) {
    if (!packages) {
        const modules = await fs.readdir('node_modules');
        packages = {};
        for (const module of modules) {
            const dist = await fs.readdir(path.resolve('node_modules', module, 'dist'), { recursive: true })
                .then(files => files.filter(file => path.extname(file) === '.js'))
                .catch(() => null);
            if (!dist) {
                packages[module] = path.resolve('/node_modules', module, 'index.js');
                continue;
            }
            for (const file of dist) {
                const real = path.resolve('/node_modules', module, 'dist', file);
                const stat = await fs.stat('.' + real);
                if (stat.isDirectory()) continue;
                if (path.dirname(file) !== '.')
                    packages[module + '/' + path.dirname(file)] = real;
                else
                    packages[module] = real;
            }
        }
        packages = JSON.stringify({ imports: packages });
    }
    if (util.matchType('html,php')) {
        util.file = util.file.replaceAll('{packages}', packages);
    }
}
module.exports.matchFile = util => {
    if (util.matchType('html,php')) return true;
    if (util.path.includes('node_modules')) {
        if (util.path.includes('dist')) return true;
        const file = path.basename(util.path);
        if ((file === 'index.js' || 
            file === 'index.mjs' ||
            file === 'index.cjs') &&
            util.path.replace(util.manager.entry, '').split('/').length === 3
        ) return true;
        util.skip = true;
    }
    return false;
}
module.exports.wheight = 1;