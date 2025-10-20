const nacl = require('tweetnacl');
const { InteractionType, InteractionCallbackType, MessageComponentType, ComponentButtonStyle } = require('./enums');
const { fromApi } = require('./web-requests');
const { commands } = require('./commands');
const crypto = require('crypto');
const { createQuoteCard, createQuoteMessage } = require('./quote-generator');
const os = require('os');
const fs = require('fs/promises');

/** @type {{ [key: string]: { expires: number, pages: string[], page: number, message: string } }} */
const buttons = {};
function MB(num) {
    const Kb = num / 1000;
    const Mb = num / 1000000;
    const Gb = num / 1000000000;
    if (Gb >= 1) return `${Gb.toFixed(2)}GB`;
    if (Mb >= 1) return `${Mb.toFixed(2)}MB`;
    if (Kb >= 1) return `${Kb.toFixed(2)}KB`;
    return `${num}B`;
}
// clear checking interval, at this interval we check for things that need to be cleared
setInterval(() => {
    for (const id in buttons) {
        if (Date.now() > buttons[id].expires)
            delete buttons[id];
    }
}, 8000);
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
        case InteractionType.MESSAGE_COMPONENT:
            const [instance, command, button] = event.data.custom_id;
            switch (command) {
            case 'search':
                switch (button) {
                case 'toFirstPage':
                    buttons[instance].page = 0;
                    break;
                case 'toPreviousPage':
                    buttons[instance].page--;
                    buttons[instance].page = Math.max(buttons[instance].page, 0);
                    break;
                case 'toNextPage':
                    buttons[instance].page++;
                    buttons[instance].page = Math.min(buttons[instance].page, buttons[instance].pages.length -1);
                    break;
                case 'toLastPage':
                    buttons[instance].page = buttons[instance].pages.length -1;
                    break;
                }
                result.type = InteractionCallbackType.UPDATE_MESSAGE;
                result.data = {
                    content: buttons[instance].pages[buttons[instance].page],
                    components: [
                        {
                            type: MessageComponentType.ActionRow,
                            components: [
                                {
                                    type: MessageComponentType.Button,
                                    style: ComponentButtonStyle.Success,
                                    label: '⭰',
                                    custom_id: `${instance}.search.toFirstPage`,
                                    disabled: buttons[instance].page <= 0
                                },
                                {
                                    type: MessageComponentType.Button,
                                    style: ComponentButtonStyle.Success,
                                    label: '←',
                                    custom_id: `${instance}.search.toPreviousPage`,
                                    disabled: buttons[instance].page <= 0
                                },
                                {
                                    type: MessageComponentType.Button,
                                    style: ComponentButtonStyle.Secondary,
                                    label: '0/' + pages.length,
                                    custom_id: `${instance}.search.pageCount`,
                                    disabled: true
                                },
                                {
                                    type: MessageComponentType.Button,
                                    style: ComponentButtonStyle.Success,
                                    label: '→',
                                    custom_id: `${instance}.search.toNextPage`,
                                    disabled: buttons[instance].page >= (buttons[instance].pages.length -1)
                                },
                                {
                                    type: MessageComponentType.Button,
                                    style: ComponentButtonStyle.Success,
                                    label: '⭲',
                                    custom_id: `${instance}.search.toLastPage`,
                                    disabled: buttons[instance].page >= (buttons[instance].pages.length -1)
                                }
                            ]
                        }
                    ]
                }
                break;
            }
            break;
        case InteractionType.APPLICATION_COMMAND:
            switch (event.data.name) {
            case 'ping':
                const ttp = Date.now() - start.getTime();
                result.type = InteractionCallbackType.CHANNEL_MESSAGE_WITH_SOURCE;
                result.data = {
                    content: `pong!!!1!1111!!!111!!\n` + 
                             `took \`${ttp}\` ms to respond\n`
                }
                break;
            case 'search':
                const instance = crypto.randomUUID();
                buttons[instance] = {
                    expires: Date.now() + 60000,
                    pages: [[]],
                    page: 0,
                    id: null
                };
                result.type = InteractionCallbackType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE;
                (async () => {
                    const files = await fs.readdir('./dist');
                    const pages = [[]];
                    for (const file of files) {
                        let page = pages.at(-1);
                        if (page.length >= 10) pages.push(page = []);
                        const path = file.split('/');
                        for (const file of path) {
                            const folder = page.find(folder => folder[0] === file);
                            if (!folder) {
                                const list = [];
                                page.push([file, list]);
                                page = list;
                                continue;
                            }
                            page = folder[1];
                        }
                        page.push(file);
                    }
                    buttons[instance].pages = pages
                        .map(page => {
                            const recurGen = (folder, level) => {
                                let res = '';
                                for (const file of folder) {
                                    res += `${level}- ${file[0]}\n`;
                                    if (file[1].length) recurGen(file[1], `${level}  `);
                                }

                                return res;
                            }

                            return recurGen(page, '');
                        })
                    const response = await fromApi(`PATCH /webhooks/${process.env.botId}/${event.token}/messages/@original`, {
                        content: buttons[instance].pages[0],
                        components: [
                            {
                                type: MessageComponentType.ActionRow,
                                components: [
                                    {
                                        type: MessageComponentType.Button,
                                        style: ComponentButtonStyle.Success,
                                        label: '⭰',
                                        custom_id: `${instance}.search.toFirstPage`,
                                        disabled: true
                                    },
                                    {
                                        type: MessageComponentType.Button,
                                        style: ComponentButtonStyle.Success,
                                        label: '←',
                                        custom_id: `${instance}.search.toPreviousPage`,
                                        disabled: true
                                    },
                                    {
                                        type: MessageComponentType.Button,
                                        style: ComponentButtonStyle.Secondary,
                                        label: '0/' + pages.length,
                                        custom_id: `${instance}.search.pageCount`,
                                        disabled: true
                                    },
                                    {
                                        type: MessageComponentType.Button,
                                        style: ComponentButtonStyle.Success,
                                        label: '→',
                                        custom_id: `${instance}.search.toNextPage`
                                    },
                                    {
                                        type: MessageComponentType.Button,
                                        style: ComponentButtonStyle.Success,
                                        label: '⭲',
                                        custom_id: `${instance}.search.toLastPage`
                                    }
                                ]
                            }
                        ]
                    });
                    buttons[instance].message = response.id;
                })();
                break;
            case 'Quote':
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
                        console.log(err);
                        if (err instanceof Error) err = err.stack;
                        if (typeof err === 'object') err = JSON.stringify(err);
                        fromApi(`PATCH /webhooks/${process.env.botId}/${event.token}/messages/@original`, { content: `Process failed with error: \n\`\`\`ansi\n${err}\`\`\`` });
                    });
                break;
            }
            break;
        }
    } catch (err) {
        console.log(err);
        if (err instanceof Error) err = err.stack;
        if (typeof err === 'object') err = JSON.stringify(err);
        result.type = InteractionCallbackType.CHANNEL_MESSAGE_WITH_SOURCE;
        result.data = { content: `Process failed with error: \n\`\`\`ansi\n${err}\`\`\`` };
    }
    res.status(codes.OK);
    res.header('Content-Type', 'application/json');
    res.send(JSON.stringify(result));
}