import './pako.js';
// note: this is reversed to how it should actually be shaped
const ZLIB_SUFFIX = new Uint8Array([255, 255, 0, 0]);
const gateway = 'wss://gateway.discord.gg';

export const dmServer = Symbol('@me')
export default class ApiInterface {
    constructor() {
        this.mustAuthImediat = false;
        this.reconUrl = gateway;
        this.sessionId = null;
        this.token = localStorage.token;
        this.version = 10;
        this.reqVisUpdate = () => {};
        this.emojis = {};
        this.stickers = {};
        this.savedMedia = [];
        this.messages = {};
        this.channels = {};
        this.guilds = { [dmServer]: [] };
        this.uploadId = 0;

        this.msgBuf = new Uint8Array();
        this.infContext = new pako.Inflate({
            to: 'string',
            chunkSize: 0xFFFFFF
        });
        this.infContext.onData = txt => {
            let json;
            try {
                json = JSON.parse(txt);
            } catch (err) {
                console.log('invalid json', txt, err);
            }
            if (json) this.onpacket(json);
        }
        const url = new URL(gateway);
        url.searchParams.set('v', this.version);
        url.searchParams.set('encoding', 'json');
        url.searchParams.set('compress', 'zlib-stream');
        this.websocket = new WebSocket(url);
        this.websocket.binaryType = "arraybuffer";
        this.websocket.onopen = this.onopen.bind(this);
        this.websocket.onmessage = this.onmessage.bind(this);
        this.websocket.onerror = this.onerror.bind(this);
        this.websocket.onclose = this.onclose.bind(this);
    }

    fromApi(callPath, body) {
        const [method, path] = callPath.split(' ', 2);
        const url = new URL(`https://discord.com/api/v${this.version}${path}`);
        console.log(method, 'at', url.toString());
        const opts = {
            method,
            headers: {
                'Authorization': this.token,
                'Content-Type': 'application/json'
            }
        }
        if (method === 'GET' && body) {
            for (const [key, value] of Object.entries(body)) {
                url.searchParams.set(key, value);
            }
        } else {
            opts.body = JSON.stringify(body);
        }

        return fetch(url, opts).then(req => req.json()).catch(message => ({ message }));
    }
    uploadFile(file, meta) {
        const req = new XMLHttpRequest();
        return {
            id: meta.id,
            filename: file.name,
            uploaded_name: meta.upload_name,
            set onprogress(func) {
                req.addEventListener('progress', func);
            },
            promise: new Promise((resolve, reject) => {
                req.open('PUT', meta.upload_url);
                req.onerror = req.onabort = reject;
                req.onload = resolve;
                req.send(file);
            }),
            cancel() {
                req.abort();
                fetch(meta.upload_url, { method: 'DELETE' });
            }
        };
    }
    async sendMessage(msg, channel) {
        if (msg.attachments.length) {
            const attachments = msg.attachments;
            msg.attachments = [];
            for (const attachment of attachments) {
                if (await attachment.promise.catch(() => true)) continue;
                msg.attachments.push({
                    id: attachment.id,
                    filename: attachment.filename,
                    uploaded_name: attachment.upload_name
                });
            }
        }
        this.fromApi(`POST /channels/${channel}/messages`, msg);
    }

    reconnect(useGateway, message) {
        console.warn('reconnecting because', message);
        this.mustAuthImediat = !useGateway;
        const reconUrl = useGateway
            ? gateway
            : this.reconUrl;
        this.websocket.close();
        const url = new URL(reconUrl);
        url.searchParams.set('v', this.version);
        url.searchParams.set('encoding', 'json');
        url.searchParams.set('compress', 'zlib-stream');
        this.websocket = new WebSocket(reconUrl);
        this.websocket.binaryType = "arraybuffer";
        this.websocket.onopen = this.onopen.bind(this);
        this.websocket.onmessage = this.onmessage.bind(this);
        this.websocket.onerror = this.onerror.bind(this);
        this.websocket.onclose = this.onclose.bind(this);
    }
    onopen() {
        if (this.mustAuthImediat) {
            // always unset because this is for an explicit task that can not be reiterated elsewhen
            this.mustAuthImediat = false;
            this.send(6, {
                token: this.token,
                session_id: this.sessionId,
                seq: this.seq
            });
        }
    }
    onmessage(e) {
        const data = new Uint8Array(e.data);
        const msgBuf = this.msgBuf;
        this.msgBuf = new Uint8Array(msgBuf.length + data.length);
        this.msgBuf.set(msgBuf);
        this.msgBuf.set(data, msgBuf.length);
        const isEnd = ZLIB_SUFFIX.every((v, i) => data[data.length - (i +1)] === v);
        if (isEnd) {
            this.infContext.push(this.msgBuf, 2);
            this.msgBuf = new Uint8Array();
        }
    }
    onpacket({ op: opcode, d: data, s: seq, t: event }) {
        if (seq) this.seq = seq;
        if (event) return this.onevent(event, data);
        console.log('gateway op:', opcode, 'd:', data, 's:', seq, 't:', event);
        switch (opcode) {
        case 1:
            this.send(11);
            break;
        case 7:
            this.reconnect(false, 'server requested reconnect');
            break;
        case 9:
            this.reconnect(true, 'invalid session');
            break;
        case 10:
            this.heart = setInterval(() => {
                if (this.waitingResponse) return this.reconnect(false, 'no pong to our ping')
                this.send(1, this.seq)
            }, data.heartbeat_interval);
            this.send(2, {
                "token": this.token,
                "capabilities": 16381,
                "properties": {
                    "os": "Win32",
                    "browser": "Mozilla",
                    "device": "",
                    "system_locale": navigator.language,
                    "browser_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
                    "browser_version": "5.0",
                    "os_version": "21.0.0",
                    "referrer": "",
                    "referring_domain": "",
                    "referrer_current": "",
                    "referring_domain_current": "",
                    "release_channel": "stable",
                    "client_build_number": 291963,
                    "client_event_source": null,
                    "design_id": 0
                },
                "presence": {
                    "status": "online",
                    "since": 0,
                    "activities": [],
                    "afk": false
                },
                "compress": false,
                "client_state": {
                    "guild_versions": {}
                }
            });
            break;
        case 11:
            this.waitingResponse = false;
            break;
        }
    }
    async onevent(event, data) {
        switch (event) {
        case 'READY':
            for (const server of data.guilds) {
                for (const emoji of server.emojis) {
                    emoji.guild_id = server.id;
                    this.emojis[emoji.id] = emoji;
                }
                for (const sticker of server.stickers) {
                    sticker.guild_id = server.id;
                    this.stickers[sticker.id] = sticker;
                }
                const channels = {};
                for (const channel of server.channels) {
                    channel.guild_id = server.id
                    channels[channel.id] = channel;
                }
                for (const channel of server.threads) {
                    channel.guild_id = server.id
                    channels[channel.id] = channel;
                };
                Object.assign(this.channels, channels);
                const roles = {};
                for (const role of server.roles) roles[role.id] = role;
                this.guilds[server.id] = {
                    ...server.properties,
                    channels,
                    roles
                };
            }
            console.log(this);
            break;
        case 'MESSAGE_EDIT': 
        case 'MESSAGE_CREATE':
            if (data.channel_id !== channel) break;
            this.reqVisUpdate(event, data);
            this.messages[data.id] = data;
            if (Object.keys(this.messages).length > 200) 
                delete this.messages[Object.keys(this.messages)[0]];
            break;
        case 'MESSAGE_DELETE':
            if (data.channel_id !== channel) break;
            this.reqVisUpdate(event, data);
            delete this.messages[data.id];
            break;
        }
    }
    onerror() {
        this.reconnect(false, 'websocket errored');
    }
    onclose() {
        clearInterval(this.heart);
    }

    send(opcode, data) {
        const obj = {
            op: opcode,
            d: data
        };
        this.websocket.send(JSON.stringify(obj));
    }
}