const { parse } = require('yaml');
const fs = require('fs');
const path = require('path');
const ShareManager = require('../share-port');

const confPath = path.resolve(process.env.HOME, '.share-config.yaml');
if (!fs.existsSync(confPath)) fs.copyFileSync(require.resolve('./config.yaml'), confPath);
const config = parse(fs.readFileSync(confPath, 'utf8'));

process.on('uncaughtException', err => console.error(err));
process.on('unhandledRejection', err => console.error(err));
const share = ShareManager.connectToPort(config.server, config.name);
share.passcode = config.password;
for (const file of config.files) {
    const target = file.path ?? file;
    const name = file.name ?? path.basename(file.path);
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
        const folder = name;
        for (const name of fs.readdirSync(target)) {
            const file = path.resolve(target, name);
            console.log('Adding file', file);
            share._addFile(file, `${folder}/${path.basename(file)}`);
        }
        continue;
    }
    console.log('Adding file', file);
    share._addFile(file.path ?? file, name);
}