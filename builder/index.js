const PrecompManager = require('./precomp-manager');

const manager = new PrecompManager('./public_html');
manager.buildAll();