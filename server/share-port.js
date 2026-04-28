const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { createCanvas, loadImage } = require('canvas');
const child = require('child_process');
const { Readable } = require('stream');
const crypto = require('crypto');
let ffmpegSupport = [];
child.exec('ffmpeg -hide_banner -formats', (error, stdout, stderr) => {
    if (error) return console.warn('Could not use ffmpeg:', error);
    ffmpegSupport = stdout.split('\n')
        .slice(4)
        .map(line => line.match(/^\s*(D?)(E?)\s*([0-9a-zA-Z_,]*)\s*(.*)$/))
        .map(info => ({ decode: !!info[1], encode: !!info[2], extensions: info[3].split(','), names: info[4] }))
        // special tea
        .filter(info => info.decode)
        .map(info => info.extensions)
        .flat();
})

const deadShares = [];
global.shares = []; // global, as thats kinda the point
class ShareManager {
    /** @type {WebSocket} */
    socket = null;
    name = '';
    timeout = null;
    loggedIn = false;
    messageId = 0;
    doingId = 0;
    attempts = 0;
    isClient = false;
    passcode = null;
    username = null;
    /** @type {{ name: string, path: string, size: number, date: number }[]} */
    sharedFiles = []; // client only
    defaultFolder = '';
    /** @type {{ [key: string]: { stream: import('stream').Readable | import('stream').Writable, name: string, path: string, position: number, type: number } }} */
    handles = {};
    handleId = 0;
    static Reply = 0;
    static Error = 1;
    static Cancel = 2;
    static Authorize = 3;
    static SetPassword = 4;
    static HasFile = 5;
    static ListFiles = 6;
    static MirrorFiles = 7;
    static OpenFileRead = 8;
    static OpenFileWrite = 9;
    static ReadChunk = 10;
    static WriteChunk = 11;
    static CloseFile = 12;
    static MoveChunkPosition = 13;
    static HasHandle = 14;
    static ForwardMessage = 15;
    static GetFileIcon = 16;
    static Ping = 17;
    static FileModeRead = 0;
    static FileModeWrite = 1;
    methods = {
        [ShareManager.Reply]: (...args) => {
            const nonce = args.pop();
            const flight = this.inFlights[nonce];
            switch (flight.opcode) {
            case ShareManager.OpenFileRead:
                flight.onData(...args);
                break;
            default:
                flight?.resolve?.(args.length > 1 ? args : args[0]);
                break;
            }
        },
        /**
         * Indicates that an error occured while attempting to perform an action.
         * @param {string} message A short message stating what happened
         * @param {number} nonce Message identifier
         */
        [ShareManager.Error]: (message, nonce) => {
            // if WE recieve an error from the client, what to do depends on the fault and the action, though in all cases its worthwhile to log
            console.warn('Client failed with message', message, 'for', this.inFlights[nonce]?.opcode);
            if (this.inFlights[nonce]?.reject) this.inFlights[nonce].reject(message);
        },
        /**
         * Cancels an in-flight nonce id, meaning whatever it was doing can nolonger be continued
         * @param {number} nonce Arbitrary number that identifies a message
         * @server
         */
        [ShareManager.Cancel]: nonce => this.inFlights[nonce].done(),
        /**
         * Authorizes this connection. Must be called before any other actions.
         * @param {string} passcode The password
         * @server
         */
        [ShareManager.Authorize]: async (passcode, username, nonce) => {
            if (this.isClient) return this.reply(ShareManager.Error, nonce, 'Must Be Server');
            // if we werent given a string password, dont bother saying anything, just exit immediately
            if (typeof passcode !== 'string') return this.exit();
            if (typeof username !== 'string') return this.exit();
            const isGood = await users.authorize(username, passcode);
            this.loggedIn = isGood;
            // dont keep the socket open on auth fail, we dont really want them to be able to slam this method in what ever way they want
            if (!isGood) return this.exit(); 
            clearTimeout(this.timeout);
            this.reply(ShareManager.Reply, nonce, this.reconnectId).done();
            this.ping(4000);
            shares.push(this); // push to public once authorized
        },
        /**
         * Sets the password for all future connections. Does not reject the current connection.
         * @param {string} newPass The new password to use for authentication
         * @param {number} nonce Message identifier
         * @server
         */
        [ShareManager.SetPassword]: async (newPass, nonce) => {
            if (this.isClient) return this.reply(ShareManager.Error, nonce, 'Must Be Server').done();
            if (typeof newPass !== 'string') return this.reply(ShareManager.Error, nonce, 'Input Must Be String').done();
            passhash = newPass;
            fs.writeFileSync('../passcode-hash.hex', passhash);
            this.reply(ShareManager.Reply, nonce).done();
        },
        /**
         * Checks if a file exists amongst any of the available sources
         * @param {string} filename The filename search string, can use stars to mark arbitrary sections
         * @param {number} nonce The message ID to reply with
         * @server Checks if anyone has this file
         * @client Checks if this host has the file
         */
        [ShareManager.HasFile]: async (filename, nonce) => {
            if (this.isClient) {
                const index = this.sharedFiles.findIndex(this._filterFiles(filename));
                return this.reply(ShareManager.Reply, nonce, index >= 0).done();
            }
            const result = await Promise.all(shares.map(share => share.hasFile(filename)));
            this.reply(ShareManager.Reply, nonce, result.some(Boolean)).done();
        },
        /**
         * Lists all files available
         * @param {string} [filename] The filename to search with, optional
         * @param {number} nonce The message ID to reply withs
         * @server Provides a concatenated list of all available files from all sources
         * @client Provides a list of files this client is serving
         */
        [ShareManager.ListFiles]: async (filename, nonce) => {
            if (typeof nonce !== 'number') { nonce = filename; filename = '*'; }
            if (this.isClient) {
                const files = this.sharedFiles
                    .filter(this._filterFiles(filename))
                    .map(file => ({ name: file.name, size: file.size, date: file.date }));
                return this.reply(ShareManager.Reply, nonce, files).done();
            }
            const results = (await Promise.all(shares.map(async share => [share, await share.listFiles(filename)])))
                .map(([share, files]) => files.map(file => ({ ...file, owner: share.name })))
                .flat();
            this.reply(ShareManager.Reply, nonce, results).done();
        },
        [ShareManager.MirrorFiles]: async (filename, nonce) => {
            const [type, size, name, handle] = this.openReadFile(filename)
                .catch(err => {
                    if (typeof err === 'string') return [null,null,err,null];
                    throw err;
                }); 
            if (typeof handle !== 'string') return this.reply(ShareManager.Error, nonce, name).done();
            const writeHandles = [];(await Promise.all(shares.map(share => share.openWriteFile(name).then(([type, handle]) => [share, handle]).catch(() => null))))
                .filter(Boolean);
            for (const share in shares) {
                const [type, handle] = await this.openWriteFile(name).catch(() => []);
                // catches two stones with one bird
                if (type !== ShareManager.FileModeWrite) {
                    this.closeFile(handle); // incase it did actually open the file, just not how we wanted
                    continue;
                }
                writeHandles.push([share, handle]);
            }
            
            let chunk;
            while (chunk = await this.readChunk(handle).catch(() => null))
                writeHandles.forEach(([share, handle]) => share.writeChunk(handle, chunk));

            this.closeFile(handle);
            this.reply(ShareManager.Reply, nonce, writeHandles.length);
        },
        [ShareManager.OpenFileRead]: (filename, shouldStream, nonce) => {
            if (typeof nonce !== 'number') { nonce = shouldStream; shouldStream = true; }

            if (!this.isClient) return this.reply(ShareManager.Error, nonce, 'Cannot read from server').done();
            const file = this.sharedFiles.find(this._filterFiles(filename));
            if (!file) return this.reply(ShareManager.Error, nonce, 'File Doesnt Exist').done();
            const id = this.handleId++;
            const stream = fs.createReadStream(file.path);
            const handle = this.handles[id] = {
                stream,
                name: file.name,
                path: file.path,
                position: 0,
                type: ShareManager.FileModeRead
            };
            stream.on('open', fd => handle.fd = fd);
            if (shouldStream) {
                stream.on('data', chunk => this.reply(ShareManager.Reply, nonce, chunk).done());
                stream.on('end', () => this.reply(ShareManager.Reply, nonce, Buffer.alloc(0)).done())
            }
            if (!shouldStream) stream.pause();
            this.reply(ShareManager.Reply, nonce, this.handles[id].type, file.size, file.name, id).done();
        },
        [ShareManager.ReadChunk]: (fileId, nonce) => {
            const handle = this.handles[fileId];
            if (!handle) return this.reply(ShareManager.Error, nonce, 'Handle Doesnt Exist').done();
            if (handle.type !== ShareManager.FileModeRead) return this.reply(ShareManager.Error, nonce, 'Handle Must Be Reader').done();
            const chunk = handle.stream.read();
            // normally null chunks are good enough, but not here, since we can begin reading well ahead of the stream actually having any data yet
            if (handle.stream.closed) return this.reply(ShareManager.Error, nonce, 'File Done').done();
            if (!chunk) return this.reply(ShareManager.Reply, nonce, Buffer.alloc(0)).done();
            handle.position += chunk.length;
            this.reply(ShareManager.Reply, nonce, chunk).done();
        },
        [ShareManager.OpenFileWrite]: async (filename, nonce) => {
            if (!this.isClient) return this.reply(ShareManager.Error, nonce, 'Cannot write to server').done();
            let file = this.sharedFiles.find(this._filterFiles(filename));
            if (!file) file = await this._addNewFile(filename);
            const id = this.handleId++;
            const stream = fs.createWriteStream(file.path, { encoding: 'ascii', flush: true });
            const handle = this.handles[id] = {
                stream,
                name: file.name,
                path: file.path,
                position: 0,
                type: ShareManager.FileModeWrite
            };
            stream.on('open', fd => handle.fd = fd);
            this.reply(ShareManager.Reply, nonce, this.handles[id].type, id).done();
        },
        [ShareManager.WriteChunk]: async (fileId, chunk, nonce) => {
            const handle = this.handles[fileId];
            if (!handle) return this.reply(ShareManager.Error, nonce, 'Handle Doesnt Exist').done();
            if (handle.type !== ShareManager.FileModeWrite) return this.reply(ShareManager.Error, nonce, 'Handle Must Be Writer').done();
            handle.position += chunk.length;
            handle.stream.write(chunk);
            this.reply(ShareManager.Reply, nonce, handle.position).done();
        },
        [ShareManager.CloseFile]: async (fileId, nonce) => {
            const handle = this.handles[fileId];
            if (!handle) return this.reply(ShareManager.Error, nonce, 'Handle Doesnt Exist').done();
            handle.stream.destroy();
            delete this.handles[fileId];
            this.reply(ShareManager.Reply, nonce).done();
        },
        [ShareManager.MoveChunkPosition]: async (fileId, offset, nonce) => {
            const handle = this.handles[fileId];
            if (!handle) return this.reply(ShareManager.Error, nonce, 'Handle Doesnt Exist').done();
            handle.position += offset;
            if (handle.position < 0 || isNaN(handle.position) || !isFinite(handle.position)) handle.position = 0;
            switch (handle.type) {
            case ShareManager.FileModeRead: handle.stream = fs.createReadStream(handle.path, { fd: handle.fd, start: handle.position }); break;
            case ShareManager.FileModeWrite: handle.stream = fs.createWriteStream(handle.path, { fd: handle.fd, start: handle.position }); break;
            }
            this.reply(ShareManager.Reply, nonce, handle.position).done();
        },
        [ShareManager.HasHandle]: (handle, nonce) => this.reply(ShareManager.Reply, nonce, !!this.handles[handle]).done(),
        [ShareManager.GetFileIcon]: async (filename, nonce) => {
            if (!this.isClient) return this.reply(ShareManager.Error, nonce, 'Cannot read from server').done();
            const file = this.sharedFiles.find(this._filterFiles(filename));
            if (!file) return this.reply(ShareManager.Error, nonce, 'File Doesnt Exist').done();
            if (file.name in this.iconCache) {
                if (!this.iconCache[file.name]) return this.reply(ShareManager.Error, nonce, 'File Cant Be Iconned').done();
                const data = await new Promise((g,b) => fs.readFile(this.iconCache[file.name], (e,d) => e ? b(e) : g(d)));
                if (data) return this.reply(ShareManager.Reply, nonce, data).done();
            }

            const ext = path.extname(filename).slice(1);
            let iconData;
            if (['png', 'jpeg', 'jpg', 'svg', 'pdf'].includes(ext)) {
                iconData = await new Promise((g,b) => fs.readFile(file.path, (e,d) => e ? b(e) : g(d)));
            } else if (ffmpegSupport.includes(ext)) {
                const temp = await new Promise(r => fs.mkdtemp('icon-factory', (e,f) => r(f)));
                const iconPath = path.resolve(temp, 'icon.jpg');
                await new Promise(r => child.exec(`ffmpeg -i '${file.path.replaceAll('\'', '\\\'')}' -frames:v 1 '${iconPath.replaceAll('\'', '\\\'')}'`, r));
                iconData = await new Promise(g => fs.readFile(iconPath, (e,d) => g(d)));
                fs.rm(temp, { recursive: true, force: true }, () => {});
            } else {
                this.reply(ShareManager.Error, nonce, 'File Type Not Supported');
                return;
            }

            if (!iconData) {
                this.iconCache[file.name] = null;
                return this.reply(ShareManager.Error, nonce, 'File Cant Be Iconned').done();
            }
            const icon = await loadImage(iconData).catch(() => {});
            if (!icon) {
                this.iconCache[file.name] = null;
                return this.reply(ShareManager.Error, nonce, 'File Cant Be Iconned').done();
            }
            const scale = Math.min(32 / icon.width, 32 / icon.height);
            const canvas = createCanvas(Math.round(icon.width * scale), Math.round(icon.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(icon, 0, 0, canvas.width, canvas.height);
            // webp isnt supported for exporting from canvas /sad
            // good thing low-quality jpegs are goated with the sauce
            const data = canvas.toBuffer('image/jpeg', { quality: 0.45 });
            const id = this.cacheId++;
            const cacheFile = path.resolve(global.cacheFolder, `./${id}.jpg`)
            fs.writeFile(cacheFile, data, e => e && console.warn(e));
            this.iconCache[file.name] = cacheFile;
            this.reply(ShareManager.Reply, nonce, data).done();
        },
        [ShareManager.Ping]: wait => {
            this.pingWait = (wait * 2) + 1000;
            setTimeout(() => this.reply(ShareManager.Ping, null, wait).done(), wait);
        }
    }
    cacheId = 0;
    iconCache = {};
    inFlights = {};
    lastPing = Date.now();
    pingWait = 6000;
    reconnectId = null;

    constructor(isClient, socket) {
        if (!isClient) this.reconnectId = crypto.randomUUID();
        this.isClient = isClient;
        this._attachToSocket(socket);
        const intr = setInterval(() => {
            if (!this.socket) return;
            if (this.socket.readyState < this.socket.CLOSING && (Date.now() - this.lastPing) < this.pingWait) return;
            if ((Date.now() - this.lastPing) < this.pingWait) 
                console.log('Socket went stale');
            else 
                console.log('Socket closed unintentionally');
            this.lastPing = Date.now(); // make sure this doesnt keep repeatedly catching out ass
            this.socket.close() // ensure we are indeed closing
            if (!this.isClient) {
                // clean our selves out of the main list
                deadShares.push(this);
                shares.splice(this.index, 1);
                this.socket = null;
                console.log('Holding onto hope for', this.name);
                // wait ten minutes to trash the entire state
                setTimeout(() => {
                    if (this.socket) return;
                    console.log('Lost hope for', this.name);
                    clearInterval(intr);
                    this.exit();
                    const idx = deadShares.indexOf(this);
                    if (idx < 0) return;
                    deadShares.splice(idx, 1);
                }, 10 * 60 * 1000);
                return;
            }
            // doesnt seem necessary? would normally just be to avoid weird shenanigans with ratelimit, which we dont have
            // if (this.attempts > 5) {
            //     clearInterval(intr);
            //     this.exit();
            //     return;
            // }
            console.log('Attempting reconnect to server');
            const url = new URL(this.socket.url);
            url.searchParams.set('name', this.name);
            url.searchParams.set('reconnectId', this.reconnectId);
            this._attachToSocket(new WebSocket(url));
            this.attempts++;
        }, 1000);
    }
    _attachToSocket(socket) {
        this.socket = socket;
        this.socket.binaryType = 'buffer';
        /** @param {Buffer} data */
        this.socket.onmessage = message => {
            const data = message.data;
            const args = [];
            let opcode;
            let nonce;
            try { 
                if (data.length < 3) return this.reply(1, null, 'Packet Too Small').done();
                let offset = 0;
                opcode = data.readUInt8(offset); offset += 1;
                nonce = data.readUInt16LE(offset); offset += 2;
                if (opcode >= this.methods.length || !this.methods[opcode]) return this.reply(1, nonce, 'None-existent Opcode').done();
                if (opcode > 3 && !this.loggedIn && !this.isClient) return this.reply(1, nonce, 'Must Authenticate').done();
                while (offset < data.length) {
                    const header = data.readUInt32LE(offset); offset += 4;
                    const length = header & 0x00FFFFFF;
                    const flags = (header & 0xFF000000) >> 24;
                    const subdata = data.subarray(offset, offset + length);
                    switch (flags) {
                    // raw binnary data
                    default:
                    case 0b000: args.push(subdata); offset += length; break;
                    // UTF8 text data
                    case 0b001: args.push(subdata.toString('utf8')); offset += length; break;
                    // JSON text data
                    case 0b010: args.push(JSON.parse(subdata.toString('utf8'))); offset += length; break;
                    // Numer data, short (ish)
                    case 0b100: args.push(length); break;
                    // Number data, float
                    case 0b101: args.push(subdata.readFloatLE(0)); offset += length; break;
                    }
                }
            } catch (err) {
                console.error(err);
                return this.reply(1, nonce, 'Unhandled Syntax Error').done();
            }
            try {
                // console.log('Running request for', opcode, 'with', ...args);
                this.methods[opcode].call(this, ...args, nonce);
            } catch (err) {
                console.error(err);
                return this.reply(1, nonce, 'Unhandled Command Error').done();
            }
        }
        // treat error the same as close
        this.socket.onerror = this.socket.onclose = () => console.log('Connection requested closure');
        this.socket.onopen = () => {
            this.lastPing = Date.now();
            console.log('Server connected');
            this.attempts = 0;
            if (this.passcode !== null) this.authorize(this.passcode, this.username).then(() => console.log('Connected to the server successfully'));
            // clients shouldnt timeout
            if (!this.isClient) this.timeout = setTimeout(() => { if (!this.loggedIn) this.exit.bind(this) }, 4000);
        }
    }
    /**
     * Sends out a message to the connected client
     * @param {number} opcode The command to send
     * @param {number} nonce The ID of the message this is in reply to, null for a new message
     * @param {...(string|number|Object|Buffer)} args The arguments array to pass to the command
     * @returns {{ [key: string]: any, opcode: number, done: () => void, promise: () => Promise<any> }} The in-flight state container for this message
     */
    reply(opcode, nonce, ...args) {
        // console.log('Sending', opcode, 'with', ...args);
        const encoded = [];
        // opcode + nonce
        let totalLength = 3;
        for (const arg of args) {
            switch (typeof arg) {
            case 'undefined': break;
            case 'number': {
                if (arg < 16777216 && arg >= 0) {
                    encoded.push([0b100, arg, Buffer.alloc(0)]);
                    totalLength += 4;
                    break;
                }
                const buf = Buffer.alloc(4);
                buf.writeFloatLE(arg);
                totalLength += buf.length +4;
                encoded.push([0b101, buf.length, buf]);
                break;
            }
            case 'string': {
                const buf = Buffer.from(arg);
                totalLength += buf.length +4;
                encoded.push([0b001, buf.length, buf]);
                break;
            }
            case 'object':
                if (Buffer.isBuffer(arg)) {
                    totalLength += arg.length +4;
                    encoded.push([0b000, arg.length, arg]);
                    break;
                }
            default: {
                const buf = Buffer.from(JSON.stringify(arg));
                totalLength += buf.length +4;
                encoded.push([0b010, buf.length, buf]);
                break;
            }
            }
        }
        let offset = 0;
        const data = Buffer.alloc(totalLength);
        data.writeUInt8(opcode, offset); offset += 1;
        nonce ??= this.messageId++;
        data.writeUInt16LE(nonce, offset); offset += 2;
        for (const [flags, length, content] of encoded) {
            data.writeUInt32LE((flags << 24) | (length & 0xFFFFFF), offset); offset += 4;
            content.copy(data, offset); offset += content.length;
        }

        this.socket.send(data);
        const share = this;
        if (this.inFlights[nonce]) return this.inFlights[nonce];
        return this.inFlights[nonce] = {
            opcode,
            nonce,
            done() {
                delete share.inFlights[nonce];
                this.realReject?.('Request Canceled');
            },
            promise() { return new Promise((resolve, reject) => {
                this.resolve = value => {
                    // we dont want done to emit its signal closed error
                    delete this.realReject;
                    this.done();
                    resolve(value);
                };
                this.reject = error => {
                    // we dont want done to emit its signal closed error
                    delete this.realReject;
                    this.done();
                    reject(error);
                }
                this.realReject = reject;
            }) }
        };
    }
    exit() {
        shares.splice(this.index, 1);
        this.socket.onerror = this.socket.onclose = this.socket.onopen = this.socket.onmessage = null;
        this.socket.close();
        this.socket = null;
        // force all in flights to die deathidly
        for (const nonce in this.inFlights)
            this.inFlights[nonce].done();
        console.log('Closing socket', this.name);
    }
    _filterFiles(match) {
        if (!/[^*]/.test(match)) return () => true;
        if (!match) return () => false;
        return file => {
            let j = 0;
            for (let i = 0; i < match.length; i++) {
                if (match[i] === '*') {
                    if (i == match.length -1) return true;
                    const next = file.name.indexOf(match[i++], j);
                    if (next < 0) return false;
                    j = next;
                    continue;
                }
                if (match[i] !== file.name[j]) return false;
                j++;
            }
            return true;
        }
    }
    async _addFile(file, name) {
        /** @type {fs.Stats} */
        const stats = await new Promise((resolve, reject) => fs.stat(file, (err, stats) => err ? reject(err) : resolve(stats)));
        if (!stats.isFile()) throw new Error('Path must exclusively point to files');
        const fileMeta = {
            name: name ?? path.basename(file),
            path: file,
            size: stats.size,
            date: stats.mtime
        };
        this.sharedFiles.push(fileMeta);
        return fileMeta;
    }
    _removeFile(filename) {
        const file = this.sharedFiles.findIndex(this._filterFiles(filename));
        if (file <= -1) return;
        this.sharedFiles.splice(file, 1);
    }
    async _addNewFile(file) {
        const fileMeta = {
            name: file,
            path: path.resolve(this.defaultFolder, path.normalize(file.replaceAll('\.{1,2}', ''))),
            size: stats.size,
            date: stats.mtime.getTime()
        };
        let suffix = 1;
        while (await new Promise(resolve => fs.access(fileMeta.path, fs.constants.F_OK, err => resolve(!err)))) {
            fileMeta.name = `${file} (${suffix})`;
            fileMeta.path = path.resolve(this.defaultFolder, path.normalize(fileMeta.name.replaceAll('\.{1,2}', '')));
            suffix++;
        }
        this.sharedFiles.push(fileMeta);
        return fileMeta;
    }
    get index() {
        return shares.findIndex(share => share.socket === this.socket);
    }

    /**
     * Authorizes this connection with a password, closes the socket if incorrect
     * @param {string} passcode The password required to access this port
     * @param {string} username The username required to access this port
     * @returns {Promise<string>} Resolves to the reconnection id
     */
    authorize(passcode, username) {
        this.passcode = passcode;
        this.username = username;
        return this.reply(ShareManager.Authorize, null, passcode, username).promise()
            .then(id => this.reconnectId = id); // hooked here so we can automatically handle reconnection
    }
    /**
     * Sets the password of the server, fails when applied to clients
     * @param {string} newPass The new password to use
     * @returns {Promise} No value, just resolves once saved
     */
    setPassword(newPass) { return this.reply(ShareManager.SetPassword, null, newPass).promise(); }
    /**
     * Checks if a single given file is available through this socket
     * @param {string} filename The filename search string, stars mark arbitrary lengths of arbitrary characters
     * @returns {Promise<boolean>} If the file is available
     */
    hasFile(filename) { return this.reply(ShareManager.HasFile, null, filename).promise(); }
    /**
     * Lists all available files through this socket
     * @param {string} filename The filename search string, stars mark arbitrary lengths of arbitrary characters
     * @returns {Promise<{ name: string, size: number, date: number }[]>} List of files
     */
    listFiles(filename) { return this.reply(ShareManager.ListFiles, null, filename).promise(); }
    /**
     * Mirrors a file accross all currently connected shares, updating if it already exists
     * @param {string} filename The file to mirror
     * @returns {Promise<number>} The number of shares the file was mirrored to
     */
    mirrorFile(filename) { return this.reply(ShareManager.MirrorFiles, null, filename).promise(); }
    /**
     * Opens a file for read-only access
     * @param {string} filename The file to begin reading
     * @returns {Promise<[number, number, string, number, Duplex?]>} The type, size, name, and handle for this file
     */
    openFileRead(filename, shouldStream) {
        const flight = this.reply(ShareManager.OpenFileRead, null, filename);
        if (!shouldStream) return flight.promise();
        return new Promise((resolve, reject) => {
            const chunks = [];
            const stream = new Readable({
                read() { return chunks.unshift() }
            });
            flight.realReject = reject;
            flight.reject = error => {
                // we dont want done to emit its signal closed error
                delete flight.realReject;
                flight.done();
                reject(error);
            }
            flight.onData = (...args) => {
                if (args.length >= 4) return resolve([...args, stream]);
                if (args[0].length <= 0) stream.end();
                chunks.push(args[0]);
            }
        })
    }
    /**
     * Opens a file for write-only access
     * @param {string} filename The file to begin writing
     * @returns {Promise<[number, number]>} The type and handle for this file
     */
    openFileWrite(filename) { return this.reply(ShareManager.OpenFileWrite, null, filename).promise(); }
    /**
     * Reads in an arbitrary length of chunk from the handle
     * @param {number} handle The file handle to read from
     * @returns {Promise<Buffer>} The chunk read
     */
    readChunk(handle) { return this.reply(ShareManager.ReadChunk, null, handle).promise(); }
    /**
     * Writes in an arbitrary length of chunk from the handle
     * @param {number} handle The file handle to read from
     * @param {Buffer} chunk The chunk data to write
     * @returns {Promise<number>} The new position inside the file
     */
    writeChunk(handle, chunk) { return this.reply(ShareManager.WriteChunk, null, handle, chunk).promise(); }
    /**
     * Closes a files handle to finish reading/writing to the file
     * @param {number} handle The handle of the file to close
     * @returns {Promise} No return value
     */
    closeFile(handle) { return this.reply(ShareManager.CloseFile, null, handle).promise(); }
    /**
     * Changes where in the file data will be written to/read from
     * @param {number} handle The file handle to reposition
     * @param {number} offset The amount to add to the position
     * @returns {Promise<number>} The new position inside the file
     */
    movePosition(handle, offset) { return this.reply(ShareManager.MoveChunkPosition, null, handle, offset).promise(); }
    /**
     * Gets any given files icon image
     * @param {string} filename The name of the file to get an icon for
     * @returns {Promise<Buffer>} The icon image
     */
    getFileIcon(filename) { return this.reply(ShareManager.GetFileIcon, null, filename).promise(); }
    /**
     * Pings the remote
     * @param {number} wait The time that remote should wait before sending back a ping
     */
    ping(wait) { return this.reply(ShareManager.Ping, null, wait).done(); }

    /**
     * @param {import('express').Request} req 
     * @param {import('websocket-express').WSResponse} res 
     */
    static async openSharePort(req, res) {
        if ('reconnectId' in req.query) {
            const shareIdx = deadShares.findIndex(share => share.reconnectId === req.query.reconnectId);
            if (shareIdx >= 0) {
                const share = deadShares[shareIdx]
                share._attachToSocket(await res.accept());
                deadShares.splice(shareIdx, 1);
                console.log('New share port opened as', share.name);
                return;
            }
        }
        const share = new ShareManager(false, await res.accept());
        share.name = req.query.name ?? 'someone else';
        console.log('New share port opened as', share.name);
    }
    /**
     * Lists all files available
     * @param {string} [filename] The filename to search for 
     * @returns {Promise<{ name: string, size: number, date: number, owner: string }[]>}
     */
    static async listFiles(filename) {
        return (await Promise.all(shares.map(async share => [share, await share.listFiles(filename)])))
            .map(([share, files]) => files.map(file => ({ ...file, owner: share.name })))
            .flat();
    }
    /**
     * Opens a file for reading from the first share to have it
     * @param {string} filename The file to open read for
     * @returns {Promise<[ShareManager, number, string, number, Duplex?]>} Important and other file info
     */
    static async openFileRead(filename, shouldStream) {
        for (const share of shares) {
            const [type, size, name, handle, stream] = await share.openFileRead(filename, shouldStream).catch(() => []);
            if (typeof name !== 'string') continue;
            return [share, size, name, handle, stream];
        }
        throw new Error(`File ${filename} not found`);
    }
    static async getFileIcon(filename) {
        for (const share of shares) {
            const icon = await share.getFileIcon(filename).catch(() => {});
            if (!icon) continue;
            return icon;
        }
        throw new Error(`File ${filename} not found`);
    }
    /**
     * Setup a share client
     * @param {string} link The server URL to connect to
     * @returns {ShareManager} A share client
     */
    static connectToPort(link, name) {
        const url = new URL(link);
        url.searchParams.set('name', name);
        const socket = new WebSocket(url);
        const share = new ShareManager(true, socket);
        share.name = name;
        return share;
    }
}

module.exports = ShareManager;