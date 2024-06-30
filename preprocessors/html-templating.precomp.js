const path = require('path');
const fs = require('fs/promises');

module.exports = async function(util) {
    if (!util.matchType('.php,.html')) return true;
    if (!util.file.startsWith('<!TEMPLATE')) return true;
    const depPath = util.file.split(/<!TEMPLATE |>\r?\n\r?/, 3)[1];
    const templatePath = depPath.startsWith('/') 
        ? path.resolve(`.${depPath}`)
        : path.resolve(util.path, '..', depPath);

    const template = await fs.readFile(templatePath, 'utf8');
    const headBody = template.split(/{head}|{body}/, 3);
    const headLoc = util.file.indexOf('<head>');
    const headClose = util.file.indexOf('</head>');
    const bodyLoc = util.file.indexOf('<body>');
    const bodyClose = util.file.indexOf('</body>');
    util.replace(headLoc,    headLoc +6,   headBody[0]);
    util.replace(headClose,  bodyLoc +6,   headBody[1]);
    util.replace(bodyClose,  bodyClose +6, headBody[2]);
}