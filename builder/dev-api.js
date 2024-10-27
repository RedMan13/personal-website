const express = require('express');
const cors = require('cors')
const app = express();
const fs = require('fs/promises');
const path = require('path');
const {runPHP} = require('../preprocessors/constant-php.precomp');
const PrecompUtils = require('./precomp-utils');
const mime = require('mime');
const makeIndexJSON = require('./create-indexing');

app.use(cors())
app.get('/index.json', async (req, res) => {
    const listing = await makeIndexJSON();
    res.json(listing);
});
const index = '/index.php';
app.use(async (req, res) => {
    console.log('got request on', req.path);
    let target = path.resolve('.' + (req.path !== '/' ? req.path : index));
    const status = await fs.stat(target).catch(() => null);
    if (!status) {
        const possibleAlt = target.replace('.html', '') + '.const.php';
        const constPhp = await fs.stat(possibleAlt).catch(() => null);
        if (!constPhp) return res.status(404).send();
        target = possibleAlt;
    }
    console.log('resolved req to', target);
    const fileData = await fs.readFile(target).catch(() => null);
    if (!fileData) return res.status(404).send();
    const util = new PrecompUtils(target, fileData);
    if (util.path.endsWith('.php') && !util.path.endsWith('.const.php')) {
        console.log('running php');
        const { headers, status, html } = await runPHP(req, target)
        for (const header of Object.entries(headers))
            res.header(...header);
        res.status(status);
        util.file = html;
    }
    const precomps = (await fs.readdir('./preprocessors'))
        .filter(file => file.endsWith('.precomp.js'))
        .map(file => {
            const precomp = require(path.resolve('preprocessors', file));
            precomp.title = path.basename(file).replace('.precomp.js', '');
            return precomp;
        })
        .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
        .filter(precomp => precomp.matchFile(util));
    for (const precomp of precomps) {
        console.log('applying precomp', precomp.title)
        await precomp(util);
        await util.bake();
    }
    // always explicitly set the mime type to the *output* of runing the precomps
    res.header('Content-Type', mime.lookup(util.path.replace('.php', '.html'), 'text/plain'));
    console.log('done building, sending file');
    console.log('');
    return res.send(util.file);
})

const port = 8000
app.listen(port, async () => {
    console.log(`hosted on http://localhost:${port}`);
    console.log('');
    const dirs = await fs.readdir('./', { recursive: true });
    for (const file of dirs) {
        const extName = path.extname(file)
        if ((extName === '.php' || extName === '.html') && !file.includes('node_modules') && !file.includes('useless-history')) {
            console.log('page', `http://localhost:${port}/${file.replaceAll('\\', '/')}`);
        }
    }
    console.log('');
})