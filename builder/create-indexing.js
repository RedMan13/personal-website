const fs = require('fs/promises');
const path = require('path');

/**
 * {
 *     name: "folder",
 *     icon: "/favicon.ico",
 *     members: [
 *         {
 *             name: "file",
 *             icon: "/favicon.ico",
 *             resolve: "/file.html"
 *         }
 *     ]
 * }
 */
module.exports = async function recursiveRead(dir = './', root, isChild) {
    const dirs = await fs.readdir(dir);
    const folder = {
        name: path.basename(dir),
        icon: null,
        members: [],
        pages: 0
    };
    if (!isChild) root = path.resolve(dir);
    for (const file of dirs) {
        if (file.startsWith('.')) continue;
        const target = path.resolve(dir, file);
        const stat = await fs.stat(target);
        if (stat.isDirectory()) {
            const subFolder = await recursiveRead(target, root, true);
            if (!Object.keys(subFolder.members).length) continue;
            folder.pages += subFolder.pages;
            folder.members.push(subFolder);
            continue;
        }

        const extName = path.extname(file);
        if (extName === '.php' || extName === '.html') {
            const content = await fs.readFile(target, 'utf8');
            const title = content.match(/<title>(.*?)<\/title>/i)?.[1] ?? file;
            const icon = content.match(/<link\s+rel="icon"\s*href="(.*?)"\s*type=".*?"\s*\/?>/)?.[1] ?? '/favicon.ico';
            const resolve = target.replace(root, '')
            console.log('\tadding file', resolve, 'to index.json');
            folder.members.push({
                name: title,
                icon,
                resolve
            });
            folder.pages++;
        }
    }
    return folder;
}