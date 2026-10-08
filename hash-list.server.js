const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { createReadStream } = require('fs');

async function hash() {
    const dist = await fs.readdir('./dist', { recursive: true, withFileTypes: true });
    const server = await fs.readdir('./server', { recursive: true, withFileTypes: true });
    const root = process.cwd();

    const promises = [];
    const hashes = {};
    for (const entity of dist.concat(server)) {
        if (!entity.isFile()) continue;
        const file = path.resolve(entity.parentPath, entity.name);
        const name = path.relative(root, file);
        const stream = createReadStream(file);

        const hasher = crypto.createHash('SHA256');
        hasher.setEncoding('hex');
        stream.pipe(hasher);
        hasher.on('data', hash => hashes[name] = hash);
        promises.push(new Promise(resolve => hasher.on('data', resolve)));
    }

    await Promise.all(promises);
    return hashes;
}

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {(code: number, message: string, res: import('express').Response, retry: boolean) => void} reject 
 * @param {{ [key: string]: number }} codes 
 *
 */
module.exports = async function(req, res, reject, codes) { res.json(await hash()); }
module.exports.hash = hash;