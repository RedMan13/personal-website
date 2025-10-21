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
        if (Date.now() > buttons[id].expires) {
            fromApi(`PATCH /webhooks/${process.env.botId}/messages/${buttons[id].message}`, {
                content: buttons[id].pages[buttons[id].page] + '\n' +
                         '-# This search query has expired',
                components: []
            });
            delete buttons[id];
        }
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
    console.log('Received event type', event.type, 'from discord');
    let result = { type: 0, data: {} };
    try {
        switch (event.type) {
        case InteractionType.PING:
            console.log('Bot got pinged');
            result.type = InteractionCallbackType.PONG;
            break;
        case InteractionType.MESSAGE_COMPONENT:
            const [instance, command, button] = event.data.custom_id.split('.');
            switch (command) {
            case 'search':
                if (!buttons[instance]) {
                    result.type = InteractionCallbackType.UPDATE_MESSAGE;
                    result.data = {
                        content: '## This query has been lost',
                        components: []
                    }
                    break;
                }
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
                                    label: '⏮',
                                    custom_id: `${instance}.search.toFirstPage`,
                                    disabled: buttons[instance].page <= 0
                                },
                                {
                                    type: MessageComponentType.Button,
                                    style: ComponentButtonStyle.Success,
                                    label: '❮',
                                    custom_id: `${instance}.search.toPreviousPage`,
                                    disabled: buttons[instance].page <= 0
                                },
                                {
                                    type: MessageComponentType.Button,
                                    style: ComponentButtonStyle.Secondary,
                                    label: buttons[instance].page +1 + '/' + buttons[instance].pages.length,
                                    custom_id: `${instance}.search.pageCount`,
                                    disabled: true
                                },
                                {
                                    type: MessageComponentType.Button,
                                    style: ComponentButtonStyle.Success,
                                    label: '❯',
                                    custom_id: `${instance}.search.toNextPage`,
                                    disabled: buttons[instance].page >= (buttons[instance].pages.length -1)
                                },
                                {
                                    type: MessageComponentType.Button,
                                    style: ComponentButtonStyle.Success,
                                    label: '⏭',
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
                    // most likely wont take very long for discord state to update
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const search = event.data.options?.[0]?.value;
                    const files = await fs.readdir('./dist')
                    const sorted = !search ? files : files
                        .map(file => [[...file].filter(char => search.includes(char)).length, file])
                        .sort((a,b) => a[0] - b[0])
                        .map(file => file[1]);
                    const pages = [''];
                    for (const file of sorted) {
                        const append = `[${file}](<https://godslayerakp.serv00.net/${file.replace(/[^a-z0-9.]+/gi, '-')}>) ; `;
                        if ((pages.at(-1).length + append.length) >= 2000)
                            pages.push('');
                        pages[pages.length -1] += append;
                    }
                    console.log(pages);
                    buttons[instance].pages = pages
                    const response = await fromApi(`PATCH /webhooks/${process.env.botId}/${event.token}/messages/@original`, {
                        content: buttons[instance].pages[0],
                        components: [
                            {
                                type: MessageComponentType.ActionRow,
                                components: [
                                    {
                                        type: MessageComponentType.Button,
                                        style: ComponentButtonStyle.Success,
                                        label: '⏮',
                                        custom_id: `${instance}.search.toFirstPage`,
                                        disabled: buttons[instance].page <= 0
                                    },
                                    {
                                        type: MessageComponentType.Button,
                                        style: ComponentButtonStyle.Success,
                                        label: '❮',
                                        custom_id: `${instance}.search.toPreviousPage`,
                                        disabled: buttons[instance].page <= 0
                                    },
                                    {
                                        type: MessageComponentType.Button,
                                        style: ComponentButtonStyle.Secondary,
                                        label: buttons[instance].page +1 + '/' + buttons[instance].pages.length,
                                        custom_id: `${instance}.search.pageCount`,
                                        disabled: true
                                    },
                                    {
                                        type: MessageComponentType.Button,
                                        style: ComponentButtonStyle.Success,
                                        label: '❯',
                                        custom_id: `${instance}.search.toNextPage`,
                                        disabled: buttons[instance].page >= (buttons[instance].pages.length -1)
                                    },
                                    {
                                        type: MessageComponentType.Button,
                                        style: ComponentButtonStyle.Success,
                                        label: '⏭',
                                        custom_id: `${instance}.search.toLastPage`,
                                        disabled: buttons[instance].page >= (buttons[instance].pages.length -1)
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
    console.log('Replying with', JSON.stringify(result))
    res.send(JSON.stringify(result));
}