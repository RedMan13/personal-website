const { handleReject, codes } = require('./handle-reject.js');
const path = require('path');
const fs = require('fs/promises');
const https = require('https');
const http = require('http');

const logs = path.resolve('../logs/error.log');
module.exports = server => {
    server.use(async (req, res, next) => {
        const { token } = req.cookies;
        const userId = await users.checkToken(token);
        if (userId) {
            res.header('Server-Timing', `authorized, id;desc=${userId}`);
            req.authorized = true;
            req.userId = userId;
        }
        next();
    });

    server.get('/logs', async (req, res) => {
        if (!req.authorized || !await users.userExists(req.userId))
            return handleReject(codes.Forbidden, 'You must login to be able to view this content', res, false);
        if (!await users.canUse(req.userId, 'view-logs'))
            return handleReject(codes.Forbidden, 'You are not permitted to view this content', res, false);
        const data = await fs.readFile(logs, 'utf8');
        res.header('Content-Type', 'text/plain');
        res.send(data);
        fs.writeFile(logs, '\n');
    });
    server.get('/proxy', (req, res) => {
        (req.query.u.startsWith('https') ? https : http).get(req.query.u, req => {
            // this proxy is intended solely for image media
            // so, only mirror information that would be relevant to an image
            if (req.statusCode >= 300) 
                return handleReject(codes.MisdirectedRequest, 'This proxy is not for apis!! please only use for media, like images.', res, false);
            res.status(200);
            if ('content-type' in req.headers) res.header('Content-Type', req.headers['content-type']);
            if ('content-encoding' in req.headers) res.header('Content-Encoding', req.headers['content-encoding']);
            if ('content-length' in req.headers) res.header('Content-Length', req.headers['content-length']);
            req.pipe(res);
        }).on('error', e => { console.error(e); handleReject(codes['BadRequest'], e.message, res, false); });
    });

    const connections = [];
    server.ws('/chatbot', async (req, res) => {
        console.log('Charbot user connected o algo');
        const socket = await res.accept();
        if (!req.authorized || !await users.userExists(req.userId)/* || !await users.canUse(req.userId, 'chatbot') */) {
            console.log('ahhh they couldnt use it');
            socket.send('{ "t": "unauthorized" }');
            socket.close();
            return;
        }

        const ident = {
            target: null,
            socket,
            elevated: await users.canUse(req.userId, 'acting-chatbot'),
            username: req.userId,
            isNew: true
        }
        socket.onclose = () => {
            const idx = connections.indexOf(ident);
            connections.splice(idx, 1);
        }
        connections.push(ident);

        if (ident.elevated) {
            const targets = await users.fetchTargets('chatbot/');
            socket.send(JSON.stringify({
                t: 'targets',
                targets,
                final: targets.length < 20,
                start: true
            }));
        } else {
            ident.target = `chatbot/${req.userId}`;
            const messages = await users.fetchMessages(ident.target, 40);
            ident.isNew = !messages.length;
            socket.send(JSON.stringify({
                t: 'history',
                messages,
                final: messages.length < 40,
                start: true
            }));
        }
        console.log('okay now the client should be working');

        socket.onmessage = async e => {
            const packet = JSON.parse(e.data);
            switch (packet.t) {
                case 'targets': {
                    if (!ident.elevated) return;
                    const targets = await users.fetchTargets('chatbot/', packet.page);
                    socket.send(JSON.stringify({
                        t: 'targets',
                        targets,
                        final: targets.length < 20,
                        start: !packet.page,
                        nonce: packet.nonce
                    }));
                    break;
                }
                case 'select': {
                    if (!ident.elevated) return;
                    ident.target = packet.selected;
                    if (!ident.target) {
                        const targets = await users.fetchTargets('chatbot/', packet.page);
                        socket.send(JSON.stringify({
                            t: 'targets',
                            targets,
                            final: targets.length < 20,
                            start: true,
                            nonce: packet.nonce
                        }));
                        return;
                    }
                    ident.username = packet.selected.split('/')[1];
                    const messages = await users.fetchMessages(ident.target, 40);
                    socket.send(JSON.stringify({
                        t: 'history',
                        messages,
                        final: messages.length < 40,
                        start: true,
                        nonce: packet.nonce
                    }));
                    break;
                }
            case 'send':
                await users.createMessage(req.userId, {
                    target: ident.target,
                    content: packet.content,
                    reference: packet.reference
                });
                const outgoing = JSON.stringify({
                    t: 'newMessage',
                    setAt: new Date().toISOString(),
                    author: req.userId,
                    content: packet.content,
                    reference: packet.reference
                });
                if (!ident.elevated && !connections.some(o => o.elevated && o.target === ident.target)) {
                    console.log('new message o algo')
                    fetch('https://discord.com/api/v10/channels/1575352674113822730/messages', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bot ${process.env.botToken}`,
                            'User-Agent': `DiscordBot (https://godslayerakp.gay/discord-bot, v1)`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ content: `<@&1575352722050523290> new message at [\`${ident.target}\`](<https://godslayerakp.gay/>)` })
                    })
                }
                connections.forEach(o => {
                    if (ident.isNew && o.elevated && !o.target)
                        o.socket.send(JSON.stringify({ t: 'newTarget', target: ident.target }));
                    if (o.target !== ident.target) return;
                    o.socket.send(outgoing);
                });
                if (ident.isNew) ident.isNew = false;
                break;
            case 'nextHistory': {
                const messages = await users.fetchMessages(ident.target, 40, packet.id);
                socket.send(JSON.stringify({
                    t: 'history',
                    messages,
                    final: messages.length < 40,
                    nonce: packet.nonce
                }));
                break;
            }
            case 'search': {
                const messages = await users.searchMessages(ident.target, packet.page, {
                    pageLength: 20,
                    descending: packet.descending,
                    content: packet.content,
                    author: packet.author
                });
                socket.send(JSON.stringify({ t: 'search', messages, nonce: packet.nonce }));
                break;
            }
            case 'delete': 
                await users.deleteTarget(ident.target);
                connections.forEach(o => {
                    if (o.target !== ident.target) return;
                    o.socket.send('{ "t": "deleted" }');
                });
                break;
            }
        }
    })
}
