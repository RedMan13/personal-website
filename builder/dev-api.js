const express = require('express');
const cors = require('cors')
const app = express();
const fs = require('fs');
const path = require('path');
const {runPHP} = require('../preprocessors/constant-php.precomp');
const PrecompManager = require('./precomp-manager');
const mime = require('mime');

globalThis.isBuild = true;
const manager = new PrecompManager('dist');
app.use(cors());
const index = '/index.php';
app.use(async (req, res) => {
    console.log('got request for', req.path);
    const file = path.resolve(manager.buildDir, `.${req.path === '/' ? index : req.path}`);
    if (file.endsWith('.php')) {
        console.log('running php');
        const { headers, status, html } = await runPHP(req, file)
        for (const header of Object.entries(headers))
            res.header(...header);
        res.status(status);
        data = html;
    }
    // always explicitly set the mime type to the *output* of runing the precomps
    const mimeType = mime.lookup(file.replace('.php', '.html'), 'text/plain');
    res.header('Content-Type', mimeType);
    console.log('sending file as mime', mimeType, 'because', path.extname(file));
    console.log('');
    return res.sendFile(file);
})

const port = 3000
manager.buildAll().then(() => {
    fs.watch(manager.entry, { recursive: true }, (ev, file) => {
        file = path.resolve(file);
        if (manager.isIgnored.test(file)) return;
        if (ev === 'rename' && !manager.exists(file)) {
            fs.rm(manager.built[file], { recursive: true, force: true });
            delete manager.built[file];
            return;
        }
        if (path.basename(file) === '.buildignore') 
            return manager.makeIgnored();
        if (path.extname(file) === '.precomp.js')
            return manager.getPrecomps();
        manager.getFile(file, true);
    })
    app.listen(port, async () => {
        console.log(`hosted on http://localhost:${port}`);
        console.log('');
        const dirs = Object.values(manager.built);
        for (const file of dirs) {
            const extName = path.extname(file)
            const url = file.replaceAll('\\', '/').replace(manager.buildDir, '');
            if ((extName === '.php' || extName === '.html') && !file.includes('node_modules') && !file.includes('useless-history')) {
                console.log('page', `http://localhost:${port}${url}`);
            }
        }
        console.log('');
    })
});