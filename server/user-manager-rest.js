const { handleReject, codes } = require('./handle-reject.js');
const path = require('path');

module.exports = server => {
    server.get('/logs', async (req, res) => {
        if (!req.authorized || !await users.userExists(req.cookies.username))
            return handleReject(codes.Forbidden, 'You must login to be able to view this content', res, false);
        if (!await users.canUse(req.cookies.username, 'view-logs'))
            return handleReject(codes.Forbidden, 'You are not permitted to view this content', res, false);
        res.sendFile(path.resolve('../logs/error.log'));
    })
}
