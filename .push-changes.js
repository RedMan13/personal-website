(async () => {
const { hash } = require('./hash-list.server');
const Client = require('ssh2-sftp-client');
const path = require('path');
const sftp = new Client();

const remoteRoot = '/usr/home/godslayerakp/domains/godslayerakp.gay/public_nodejs';
const localRoot = process.cwd();

const localHashes = await hash();
const remoteHashes = await fetch('https://godslayerakp.gay/hash-list').then(req => req.json());
const allFiles = Object.keys(Object.assign({}, localHashes, remoteHashes));
const hashFiles = Object.fromEntries(Object.entries(remoteHashes).map(a => [a[1],a[0]]));
await sftp.connect({
  host: 's3.serv00.com',
  username: 'godslayerakp',
  password: process.argv[2]
});

for (const name of allFiles) {
    const remoteFile = path.resolve(remoteRoot, name);
    if (localHashes[name] === remoteHashes[name]) continue;
    if (localHashes[name] in hashFiles) {
        const oldName = hashFiles[localHashes[name]];
        const oldRemote = path.resolve(remoteRoot, oldName);
        console.log('M', oldName, '->', name);
        await sftp.rename(oldRemote, remoteFile);
        continue;
    }
    if (name in remoteHashes && !(name in localHashes)) {
        console.log('D', name);
        await sftp.delete(remoteFile);
        continue;
    }

    const localFile = path.resolve(localRoot, name);
    if (name in remoteHashes) {
        console.log('U', name);
        await sftp.fastPut(localFile, remoteFile);
        continue;
    }
    console.log('A', name);
    await sftp.mkdir(path.basename(remoteFile), true);
    await sftp.fastPut(localFile, remoteFile);
}

if (localHashes['server/package.json'] !== remoteHashes['server/package.json']) {
    await sftp.delete(path.resolve(remoteRoot, './package.json'));
    await sftp.delete(path.resolve(remoteRoot, './package-lock.json'));
    await sftp.rmdir(path.resolve(remoteRoot, './node_modules'), true);
    await sftp.rcopy(path.resolve(remoteRoot, './server/package.json'), path.resolve(remoteRoot, './package.json'));
    await sftp.client.exec(`cd '${remoteRoot.replace('\'', '\'\\\'\'')}' && npm i`);
}
sftp.end();

})()