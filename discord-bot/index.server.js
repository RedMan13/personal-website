const crypto = require('crypto');
const { InteractionType, InteractionCallbackType } = require('./enums');

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {(code: number, message: string, res: import('express').Response, retry: boolean) => void} reject 
 * @param {{ [key: string]: number }} codes 
 */
module.exports = function(req, res, reject, codes) {
    if (!req.headers['x-signature-ed25519'] || !req.headers['x-signature-timestamp']) {
        console.log('Recieved missing signatures');
        return reject(codes.Unauthorized, 'Missing signatures', res);
    }
    if (!crypto.verify(null, Buffer.from(req.headers['x-signature-timestamp'] + req.body), process.env.botPublicKey, Buffer.from(req.headers['x-signature-ed25519'], 'hex'))) {
        console.log('Recieved invalid signatures');
        return reject(codes.Unauthorized, 'Invalid signatures', res);
    }
    const start = new Date(req.headers['x-signature-timestamp']);
    const event = JSON.parse(req.body);
    let result = { type: 0, data: {} };
    switch (event.type) {
    case InteractionType.PING:
        console.log('Bot got pinged');
        result.type = InteractionCallbackType.PONG;
        break;
    case InteractionType.APPLICATION_COMMAND:
        switch (event.name) {
        case 'ping':
            const ttp = Date.now() - start;
            result.type = InteractionCallbackType.CHANNEL_MESSAGE_WITH_SOURCE;
            result.data = { content: `pong!!!1!1111!!!111!!\ntook \`${ttp}\` ms to respond` }
            break;
        }
        break;
    }
    res.header('Content-Type', 'application/json');
    res.send(JSON.stringify(result));
}