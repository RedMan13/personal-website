#!/usr/bin/env node

const PrecompManager = require('./precomp-manager');
const parseArgs = require('./argument-parser');

const args = parseArgs({
    target: [['t', 'default'], null],
    output: [['o'], 'public_html'],
    username: [['user', 'u', 'n', 'name'], null],
    password: [['pass', 'p', 'l', 'login'], null]
}, process.argv);
const manager = new PrecompManager(args.output, args.username, args.password);
if (args.target) {
    manager.getFile(args.target, true)
        .then(([path, file]) => console.log(path));
} else manager.buildAll();
