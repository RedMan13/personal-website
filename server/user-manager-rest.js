const { handleReject, codes } = require('./handle-reject.js');
const path = require('path');
const fs = require('fs/promises');
const https = require('https');
const http = require('http');

const logs = path.resolve('../logs/error.log');
module.exports = server => {
    server.get('/logs', async (req, res) => {
        if (!req.authorized || !await users.userExists(req.username))
            return handleReject(codes.Forbidden, 'You must login to be able to view this content', res, false);
        if (!await users.canUse(req.username, 'view-logs'))
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
        const socket = await res.accept();
        if (!req.authorized || !await users.userExists(req.username)/* || !await users.canUse(req.username, 'chatbot') */) {
            socket.send(JSON.stringify({ "t": "unauthorized" }));
            socket.close();
            return;
        }

        const ident = {
            target: `chatbot/${req.username}`,
            socket,
            elevated: await users.canUse(req.username, 'acting-chatbot')
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
            const messages = await users.fetchMessages(ident.target, 40);
            socket.send(JSON.stringify({
                t: 'history',
                messages,
                final: messages.length < 40,
                start: true
            }));
        }

        socket.onmessage = async e => {
            const packet = JSON.parse(e.data);
            switch (packet.t) {
                case 'targets': {
                    if (!ident.elevated) return;
                    const targets = await users.fetchTargets('chatbot/', packet.page);
                    socket.send(JSON.stringify({
                        t: 'targets',
                        targets,
                        start: !packet.page,
                        nonce: packet.nonce
                    }));
                    break;
                }
                case 'select': {
                    if (!ident.elevated) return;
                    ident.target = packet.selected;
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
                await users.createMessage(req.username, {
                    target: ident.target,
                    content: packet.content,
                    reference: packet.reference
                });
                const packet = JSON.stringify({
                    t: 'newMessage',
                    nonce: packet.nonce,
                    setAt: new Date().toISOString(),
                    content: packet.content,
                    reference: packet.reference
                });
                socket.send(packet);
                connections.forEach(ident => {
                    if (ident.target !== target) return;
                    ident.socket.send(packet);
                })
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
            }
        }
    })
}
