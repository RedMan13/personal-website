const nacl = require('tweetnacl');
const { InteractionType, InteractionCallbackType } = require('./enums');
const { fromApi } = require('./web-requests');
const { commands } = require('./commands');
const crypto = require('crypto');
const { createQuoteCard, createQuoteMessage } = require('./quote-generator');

const quoteQueue = [];
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
    if (!nacl.sign.detached.verify(
        Buffer.concat([Buffer.from(req.headers['x-signature-timestamp'], 'utf8'), req.body]), 
        Buffer.from(req.headers['x-signature-ed25519'], 'hex'),
        Buffer.from(process.env.botPublicKey, 'hex')
    )) {
        console.log('Recieved invalid signatures');
        return reject(codes.Unauthorized, 'Invalid signatures', res);
    }
    const start = new Date(Number(req.headers['x-signature-timestamp']) * 1000);
    const event = JSON.parse(req.body.toString('utf8'));
    let result = { type: 0, data: {} };
    try {
        switch (event.type) {
        case InteractionType.PING:
            console.log('Bot got pinged');
            result.type = InteractionCallbackType.PONG;
            break;
        case InteractionType.APPLICATION_COMMAND:
            switch (event.data.name) {
            case 'ping':
                const ttp = Date.now() - start.getTime();
                result.type = InteractionCallbackType.CHANNEL_MESSAGE_WITH_SOURCE;
                result.data = { content: `pong!!!1!1111!!!111!!\ntook \`${ttp}\` ms to respond` }
                break;
            case 'Quote (Card)':
                result.type = InteractionCallbackType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE;
                createQuoteCard(event.data.resolved.messages[event.data.target_id])
                    .then(image => {
                        const data = new FormData();
                        data.append('payload_json', JSON.stringify({
                            content: 'Here, have your quote',
                            attachments: [
                                {
                                    id: '0',
                                    description: 'The image of the quote that was made',
                                    filename: `attachment://quote-${event.data.target_id}.png`
                                }
                            ]
                        }));
                        data.append('files[0]', image);
                        return fromApi(`PATCH /webhooks/${process.env.botId}/${event.token}/messages/@original`, data);
                    })
                    .catch(err => {
                        fromApi(`PATCH /webhooks/${process.env.botId}/${event.token}/messages/@original`, { content: `${JSON.stringify(err)}` });
                    });
                break;
            }
            break;
        }
    } catch (err) {
        result.type = CHANNEL_MESSAGE_WITH_SOURCE;
        result.data = { content: `${JSON.stringify(err)}` };
    }
    res.status(codes.OK);
    res.header('Content-Type', 'application/json');
    res.send(JSON.stringify(result));
}