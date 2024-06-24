const express = require('express');
const cors = require('cors')
const app = express();
const fs = require('fs/promises');
const path = require('path');
const runPhp = require('./builder/php-runner');
const PrecompUtils = require('./builder/precomp-utils');
const mime = require('mime');

app.use(cors())
app.get('/index.json', async (req, res) => {
    const dirs = await fs.readdir('./', { recursive: true });
    const index = {};
    for (const file of dirs) {
        const extName = path.extname(file)
        if (extName === '.php' || extName === '.html') {
            const folders = path.dirname(file.slice(__dirname.length)).split('/');
            const fileName = path.basename(file);
            let top = index;
            for (const folder of folders) top = top[folder] ??= {};
            console.log('adding filename', fileName)
            top[fileName] = fileName.slice(0, -path.extname(fileName).length);
        }
    }

    res.json(index);
});
const index = '/index.php';
app.use(async (req, res) => {
    let target = path.resolve('.' + (req.path !== '/' ? req.path : index));
    const status = await fs.stat(target).catch(() => null);
    if (!status) {
        const possibleAlt = target.replace('.html', '.const.php')
        const constPhp = await fs.stat(possibleAlt).catch(() => null);
        if (!constPhp) return res.status(404).send();
        target = possibleAlt;
    }
    let fileData = await fs.readFile(target).catch(() => null);
    if (!fileData) return res.status(404).send();   
    if (target.endsWith('.php')) {
        const { headers, status, html } = await runPhp(req, target)
        for (const header of Object.entries(headers))
            res.header(...header);
        res.status(status);
        fileData = html;
    }
    const util = new PrecompUtils(target, fileData.toString('utf8'));
    let madeChanges = false;
    for (const file of await fs.readdir('./preprocessors')) {
        if (file.endsWith('.precomp.js')) {
            const didntRun = await require(path.resolve('preprocessors', file))(util);
            madeChanges ||= !didntRun;
        }
    }
    // if ran as php, this will be set to text/html, so dont try to set it in that case
    if (!target.endsWith('.php')) res.header('Content-Type', mime.lookup(target));
    if (madeChanges) {
        // finnalize changes so we can send them out
        util.bake();
        return res.send(util.file);
    }
    res.send(fileData);
})

const port = 8000
app.listen(port, () => console.log(`hosted on http://localhost:${port}`))