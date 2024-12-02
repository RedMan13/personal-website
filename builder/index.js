const PrecompManager = require('./precomp-manager');

const manager = new PrecompManager(...process.argv.slice(2));
manager.buildAll();
