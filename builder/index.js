const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const runPHP =  require('./php-runner');
const PrecompUtils = require('./precomp-utils');

const serverStatic = '~/domains/godslayerakp.serv00.net/public_html'
const buildDir = path.resolve('./build')
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
    const precomps = [];
    const constantPhps = [];
    const staticFiles = [];
    // unused atm, as there is no server to put the end points in
    const serverEndpoints = [];

    console.log('getting files to build...')
    const filesToIgnore = new RegExp(`^${path.resolve('.').replaceAll('\\', '\\\\') + (path.win32 ? '\\\\' : '/')}(` + fs.readFileSync('.buildignore', { encoding: 'utf8' })
        .split(/\n|\r\n/gi)
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
        case 'precomp.js':
            const precomp = require(truePath);
            precomp.name = path.basename(file, '.precomp.js');
            precomps.push(precomp);
            console.log('precomp', file);
            break;
        case 'server.js':
            serverEndpoints.push(require(truePath));
            console.log('server endpoint', file);
        case 'const.php':
            constantPhps.push([truePath, file]);
            console.log('constant php', file);
            break;
        default:
            const dest = path.resolve(buildDir, file)
            waitingCopies.push(fsp.mkdir(path.dirname(dest), { recursive: true }).then(() => fsp.copyFile(truePath, dest))); // generate copy for us to use actualy use
            staticFiles.push(path.resolve(buildDir, file));
            console.log('static', file);
        }
    }
    console.log('waiting for copy operations to finnish...')
    await Promise.all(waitingCopies);

    console.log('building constant php\'s...');
    for (const [phpSrc, pathName] of constantPhps) {
        fakeReq.path = pathName;
        console.log(`building ${pathName}...`)
        let destPath = path.resolve(buildDir, pathName.replace('.const.php', ''));
        if (path.extname(destPath).length < 2) destPath += '.html';
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, (await runPHP(fakeReq, phpSrc)).html);
        staticFiles.push(destPath);
    }

    console.log('running precomps on build files...');
    for (const file of staticFiles) {
        const fileData = fs.readFileSync(file, 'utf8');
        const utils = new PrecompUtils(file, fileData);
        let neverRan = true;
        for (const precompFunc of precomps) {
            const didntRun = await precompFunc(utils);
            if (!didntRun) console.log(`ran precomp ${precompFunc.name} on ${path.basename(file)}`)
            neverRan &&= didntRun;
        }
        
        if (!neverRan) fs.writeFileSync(file, utils.file);
    }

    console.log('forming index file for faster indexing...');
    const index = {};
    for (const file of staticFiles) {
        const extName = path.extname(file)
        if (extName === '.php' || extName === '.html') {
            const folders = path.dirname(file.slice(__dirname.length)).split('/');
            const fileName = path.basename(file);
            let top = index;
            for (const folder of folders) top = top[folder] ??= {};
            top[fileName] = fileName.slice(0, -path.extname(fileName).length);
        }
    }
    fs.writeFileSync(path.resolve(buildDir, 'index.json'), JSON.stringify(index));
})();