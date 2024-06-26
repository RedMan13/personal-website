const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const runPHP =  require('./php-runner');
const PrecompUtils = require('./precomp-utils');

const buildDir = path.resolve('./public_html');
if (fs.existsSync(buildDir)) {
    console.log('removing old build dir');
    fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir);

const fakeReq = {
    pause() {},
    pipe() {},
    resume() {},
    originalUrl: '',
    protocol: 'http',
    method: 'GET',
    hostname: 'localhost:8080',
    get() { return ''; },
    headers: {}
};
(async () => {
    console.log('\ngetting precomps...');
    const precomps = fs.readdirSync('./preprocessors')
        .filter(filePath => filePath.endsWith('.precomp.js'))
        .map(filePath => {
            const precomp = require(path.resolve('preprocessors', filePath));
            precomp.title = path.basename(filePath).replace('.precomp.js', '');
            console.log('\tprecomp', precomp.title);
            return precomp;
        })
        .sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));
    const constantPhps = [];
    const staticFiles = [];
    // unused atm, as there is no server to put the end points in
    const serverEndpoints = [];

    console.log('\ngetting files to build...');
    const toAlwaysIgnore = '\nbuild\n\\.gitignore\npreprocessors\n\\.buildignore\n\\.git\nnode_modules\npackage-lock\\.json\npackage\\.json';
    const filesToIgnore = new RegExp(`^${path.resolve('.').replaceAll('\\', '\\\\')}(\\\\|/)(` + (fs.readFileSync('.buildignore', { encoding: 'utf8' }) + toAlwaysIgnore)
        .split(/\r?\n/gi)
        .map(match => match.replace('/', '\\/'))
        .join('|') + ')', 'i');
    const files = fs.readdirSync('.', { recursive: true });
    const waitingCopies = [];
    for (const file of files) {
        const typePiece = file.split(/\\|\//g).at(-1).split('.').slice(1).join('.');
        const truePath = path.resolve(file);
        const stat = fs.statSync(truePath);
        if (filesToIgnore.test(truePath) || stat.isDirectory()) continue;
        switch (typePiece) {
        case 'server.js':
            serverEndpoints.push(require(truePath));
            console.log('\tserver endpoint', file);
        case 'const.php':
            constantPhps.push([truePath, file]);
            console.log('\tconstant php', file);
            break;
        default:
            const dest = path.resolve(buildDir, file)
            waitingCopies.push(fsp.mkdir(path.dirname(dest), { recursive: true }).then(() => fsp.copyFile(truePath, dest))); // generate copy for us to use actualy use
            staticFiles.push(path.resolve(buildDir, file));
            console.log('\tstatic', file);
        }
    }
    console.log('waiting for copy operations to finnish...');
    await Promise.all(waitingCopies);

    console.log('\nrunning precomps on build files...');
    for (const file of staticFiles) {
        const fileData = fs.readFileSync(file, 'utf8');
        const utils = new PrecompUtils(file, fileData);
        let neverRan = true;
        for (const precompFunc of precomps) {
            const didntRun = await precompFunc(utils);
            if (!didntRun) console.log(`\tran precomp ${precompFunc.title} on ${path.basename(file)}`)
            neverRan &&= didntRun;
        }
        
        if (!neverRan && utils.bake()) fs.writeFileSync(utils.path, utils.file);
    }

    console.log('\nbuilding constant php\'s...');
    for (const [phpSrc, pathName] of constantPhps) {
        fakeReq.path = pathName;
        console.log(`\tbuilding ${pathName}...`)
        let destPath = path.resolve(buildDir, pathName.replace('.const.php', ''));
        if (path.extname(destPath).length < 2) destPath += '.html';
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, (await runPHP(fakeReq, phpSrc)).html);
        staticFiles.push(destPath);
    }

    console.log('\nforming index file for faster indexing...');
    const index = {};
    for (const file of staticFiles) {
        const extName = path.extname(file)
        if (extName === '.php' || extName === '.html') {
            const folders = path.dirname(file.slice(__dirname.length)).split('/');
            const fileName = path.basename(file);
            let top = index;
            for (const folder of folders) top = top[folder] ??= {};
            console.log('\tadding filename', fileName)
            top[fileName] = fileName.slice(0, -path.extname(fileName).length);
        }
    }
    fs.writeFileSync(path.resolve(buildDir, 'index.json'), JSON.stringify(index));
})();
