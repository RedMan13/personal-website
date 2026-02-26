const ejs = require('ejs');
const path = require('path');

module.exports = async function(util) {
    util.file = `

${String(ejs.compile(util.file, {
    async: true,
    client: true,
    filename: path.relative(util.entry, util.path),
    compileDebug: false
}))}
module.exports = async function(req, res, handleReject, codes, once, storage, mongoose) {
    const headers = { status: codes.OK };
    const result = await anonymous(
        { query: req.query, body: req.body, headers },
        null,
        null,
        null
    );
    res.status(headers.status);
    for (const key in headers) {
        if (key === 'status') continue;
        res.header(key, headers[key]);
    }
    res.send(result);
}
module.exports.generator = anonymous;
    `;
    util.path = util.path.replace('.ejs', '.server.js')
};
module.exports.matchFile = util => util.matchType('.ejs');
module.exports.weight = 1;