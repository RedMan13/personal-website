const path = require('path');
const fs = require('fs/promises');
const base = path.resolve('.');

module.exports = async function(util) {
    const depPath = util.file.split(/<!TEMPLATE |>\r?\n\r?/, 3)[1];
    
    if (!depPath) return;
    const templatePath = depPath.startsWith('/') 
        ? path.resolve(`.${depPath}`)
        : path.resolve(util.path, '..', depPath);

    
    const template = (await util.getFile(templatePath))[1];
    const headBody = template.split(/{head}|{body}/, 3);
    const headLoc = util.file.indexOf('<head>');
    const headClose = util.file.indexOf('</head>');
    const bodyLoc = util.file.indexOf('<body>');
    const bodyClose = util.file.indexOf('</body>');
    util.replace(headLoc,    headLoc +6,   headBody[0]);
    util.replace(headClose,  bodyLoc +6,   headBody[1]);
    util.replace(bodyClose,  bodyClose +7, headBody[2]);
}
module.exports.matchFile = util => util.matchType('.php,.html') && util.file.startsWith('<!TEMPLATE');