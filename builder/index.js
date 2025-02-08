#!/usr/bin/env node

const PrecompManager = require('./precomp-manager');
const parseArgs = require('./argument-parser');

const args = parseArgs({
    target: [['t', 'default'], null, 'Which file to make a build of.'],
    output: [['o'], 'dist', 'Where to put build outputs.'],
    domain: [['d'], null, 'The sftp domain name to output to.'],
    username: [['user', 'u', 'n', 'name'], null, 'The login username of the sftp server.'],
    password: [['pass', 'p', 'l', 'login'], null, 'The login password of the sftp server.']
}, process.argv);
const manager = new PrecompManager(args.output, args.domain, args.username, args.password);
if (args.target) {
    manager.getFile(args.target, true)
        .then(([path, file]) => console.log(path));
} else manager.buildAll();
