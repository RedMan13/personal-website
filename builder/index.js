const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const PrecompUtils = require('./precomp-utils');
const makeIndexJSON = require('./create-indexing');

const buildDir = path.resolve('./public_html');
if (fs.existsSync(buildDir)) {
    console.log('removing old build dir');
    fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir);

(async () => {
    console.log('\ngetting precomps...');
    const precomps = fs.readdirSync('./preprocessors')
        .filter(filePath => filePath.endsWith('.precomp.js'))
        .map(filePath => {
            const precomp = require(path.resolve('preprocessors', filePath));
            precomp.title = path.basename(filePath).replace('.precomp.js', '');
            return precomp;
        })
        .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
        .map(precomp => (console.log('\tprecomp', precomp.title), precomp));
    const needsPreprocessed = [];
    const staticFiles = [];
    // unused atm, as there is no server to put the end points in

    console.log('\ngetting files to build...');
    const toAlwaysIgnore = '\npublic_html\n\\.gitignore\npreprocessors\n\\.buildignore\n\\.git\nnode_modules(\\\\|/)[^\\\\/)]*?(\\\\|/)(?!dist)\npackage-lock\\.json\npackage\\.json';
    const filesToIgnore = new RegExp(`^${path.resolve('.').replaceAll('\\', '\\\\')}(\\\\|/)(` + (fs.readFileSync('.buildignore', { encoding: 'utf8' }) + toAlwaysIgnore)
        .split(/\r?\n\r?/gi)
        .map(match => match.replace('/', '\\/'))
        .join('|') + ')', 'i');
    const files = fs.readdirSync('.', { recursive: true });
    const waitingCopies = [];
    for (const file of files) {
        const truePath = path.resolve(file);
        const stat = fs.statSync(truePath);
        if (filesToIgnore.test(truePath) || stat.isDirectory()) continue;
        const utils = new PrecompUtils(truePath, await fsp.readFile(truePath));
        if (precomps.find(precomp => precomp.matchFile(utils))) {
            needsPreprocessed.push(utils);
            continue;
        }
        waitingCopies.push(utils.bake(buildDir)); // generate a copy for us to use actualy use
        staticFiles.push(utils);
        console.log('\tstatic', file);
    }
    console.log('waiting for copy operations to finnish...');
    await Promise.all(waitingCopies);

    console.log('\nrunning precomps on build files...');
    for (const util of needsPreprocessed) {
        console.log('\trunning precomps for', path.basename(util.path))
        for (const precomp of precomps) {
            if (precomp.matchFile(util)) {
                console.log('\t\trunning precomp', precomp.title);
                await util.bake();
                await precomp(util);
            }
        }
        await util.bake(buildDir)
    }

    console.log('\nforming index file for page browsing...');
    const indexJSON = JSON.stringify(await makeIndexJSON(buildDir));
    fs.writeFileSync(path.resolve(buildDir, 'index.json'), indexJSON);
})();
