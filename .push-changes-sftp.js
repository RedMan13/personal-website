(async () => {
const { hash } = require('./hash-list.server');
const Client = require('ssh2-sftp-client');
const path = require('path');
const sftp = new Client();
sftp.exec = function(cmd, opts = {}) {
    return new Promise((resolve, reject) => 
        this.client.exec(cmd, opts, (err, channel) => err ? reject(err) : resolve(channel))
    );
}

const remoteRoot = '/usr/home/godslayerakp/domains/godslayerakp.gay/public_nodejs';
const localRoot = process.cwd();

const localHashes = await hash();
const remoteHashes = await fetch('https://godslayerakp.gay/hash-list').then(req => req.json()).catch(() => ({}));
const allFiles = Object.keys(Object.assign({}, localHashes, remoteHashes));
const hashFiles = Object.fromEntries(Object.entries(remoteHashes).map(a => [a[1],a[0]]));

sftp.on('keyboard-interactive', (name, instructions, nil, prompts, resolve) => resolve([process.argv[2]]));
await sftp.connect({
    host: 's3.serv00.com',
    username: 'godslayerakp',
    password: process.argv[2],
    tryKeyboard: true,
    // debug: console.debug
});

// if there are no local changes, assume a full fresh-start rebuild was intended
if (allFiles.every(file => localHashes[file] === remoteHashes[file])) {
    for (const key in remoteHashes)
        delete remoteHashes[key];
    await sftp.exec(`rm -rf '${path.resolve(remoteRoot, './server').replace('\'', '\'\\\'\'')}'`);
    await sftp.exec(`rm -rf '${path.resolve(remoteRoot, './dist').replace('\'', '\'\\\'\'')}'`);
}

console.log('Logged in! uploading changes.');
const promises = [];
for (const name of allFiles) promises.push((async () => {
    const remoteFile = path.resolve(remoteRoot, name);
    if (localHashes[name] === remoteHashes[name]) return;
    if (localHashes[name] in hashFiles) {
        const oldName = hashFiles[localHashes[name]];
        const oldRemote = path.resolve(remoteRoot, oldName);
        console.log('M', oldName, '->', name);
        await sftp.rename(oldRemote, remoteFile);
        return;
    }
    if ((name in remoteHashes) && !(name in localHashes)) {
        console.log('D', name);
        await sftp.delete(remoteFile);
        return;
    }

    const localFile = path.resolve(localRoot, name);
    if (name in remoteHashes) {
        console.log('U', name);
        await sftp.delete(remoteFile);
        await sftp.fastPut(localFile, remoteFile);
        return;
    }
    console.log('A', name);
    await sftp.mkdir(path.basename(remoteFile), true);
    await sftp.fastPut(localFile, remoteFile);
})());
await Promise.all(promises);

if (localHashes['server/package.json'] !== remoteHashes['server/package.json']) {
    console.log('Reinstalling node_modules on remote...');
    await sftp.delete(path.resolve(remoteRoot, './package.json'), true);
    await sftp.delete(path.resolve(remoteRoot, './package-lock.json'), true);
    // await sftp.exec(`rm -rf '${path.resolve(remoteRoot, './node_modules').replace('\'', '\'\\\'\'')}'`);
    await sftp.rcopy(path.resolve(remoteRoot, './server/package.json'), path.resolve(remoteRoot, './package.json'));
    await sftp.exec(`cd '${remoteRoot.replace('\'', '\'\\\'\'')}' && npm i`);
}
console.log('All opperations finished.');
await sftp.end();

})()