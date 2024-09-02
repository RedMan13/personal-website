import ApiInterface from "./interface.js";
import { Asset } from "./asset-helper.js";
import { getRendered } from "./message-render.js";

const permBits = [
    "CREATE_INSTANT_INVITE",
    "KICK_MEMBERS",
    "BAN_MEMBERS",
    "ADMINISTRATOR",
    "MANAGE_CHANNELS",
    "MANAGE_GUILD",
    "ADD_REACTIONS",
    "VIEW_AUDIT_LOG",
    "PRIORITY_SPEAKER",
    "STREAM",
    "VIEW_CHANNEL",
    "SEND_MESSAGES",
    "SEND_TTS_MESSAGES",
    "MANAGE_MESSAGES",
    "EMBED_LINKS",
    "ATTACH_FILES",
    "READ_MESSAGE_HISTORY",
    "MENTION_EVERYONE",
    "USE_EXTERNAL_EMOJIS",
    "VIEW_GUILD_INSIGHTS",
    "CONNECT",
    "SPEAK",
    "MUTE_MEMBERS",
    "DEAFEN_MEMBERS",
    "MOVE_MEMBERS",
    "USE_VAD",
    "CHANGE_NICKNAME",
    "MANAGE_NICKNAMES",
    "MANAGE_ROLES",
    "MANAGE_WEBHOOKS",
    "MANAGE_GUILD_EXPRESSIONS",
    "USE_APPLICATION_COMMANDS",
    "REQUEST_TO_SPEAK",
    "MANAGE_EVENTS",
    "MANAGE_THREADS",
    "CREATE_PUBLIC_THREADS",
    "CREATE_PRIVATE_THREADS",
    "USE_EXTERNAL_STICKERS",
    "SEND_MESSAGES_IN_THREADS",
    "USE_EMBEDDED_ACTIVITIES",
    "MODERATE_MEMBERS*",
    "VIEW_CREATOR_MONETIZATION_ANALYTICS",
    "USE_SOUNDBOARD",
    "CREATE_GUILD_EXPRESSIONS",
    "CREATE_EVENTS",
    "USE_EXTERNAL_SOUNDS",
    "SEND_VOICE_MESSAGES",
    "SEND_POLLS"
]
class BitMapping {
    constructor(keyMap, bits) {
        this._bits = bits;
        this._keys = Object.fromEntries(keyMap.map((name, idx) => [idx, name]));
    }
    get(key) {
        return !!((this._bits >> this._keys[key]) & 1)
    }
    set(key, bool) {
        this._bits = (this._bits & ~(bool << this._keys[key])) | (bool << this._keys[key])
    }
    merge(...bits) {
        for (const pack of bits) {
            this._bits |= pack?._bits ?? pack;
        }
    }
    toBits() {
        return this._bits;
    }
}
window.client = new ApiInterface();
document.addEventListener('DOMContentLoaded', () => {
const main = document.getElementById('main');
    main.setAttribute('style', `
        ${main.getAttribute('style') /** preserve scaling style */}
        overflow-y: hidden;
    `);
        const messageWrapper = document.createElement('div');
            messageWrapper.setAttribute('style', `
                height: 100%;
            `)
                const messageList = document.createElement('ul');
                    messageList.setAttribute('style', ` 
                        display: flex;
                        flex-direction: column-reverse;
                        overflow-y: auto;
                        height: 100%;
                        list-style-type: none;
                        padding: 0;
                        margin: 0;
                    `);
            messageWrapper.appendChild(messageList);
    main.appendChild(messageWrapper);

function lastEl(elementArray) {
    return elementArray[elementArray.length -1];
}
async function fetchMessage(msgId) {
    if (client.messages[msgId]) return client.messages[msgId];
    const message = (await client.fromApi(`GET /channels/${channel}/messages`, { limit: 1, around: msgId }))[0];
    client.messages[msgId] = message;
    if (Object.keys(client.messages).length > 200) 
        delete client.messages[Object.keys(client.messages)[0]];
    return message;
}
async function makeMessageEl(message, compact) {
    const guildId = client.channels[channel].guild_id;
    const li = document.createElement('li');
        li.setAttribute('style', `
            flex: 0 0 auto;
        `);
        li.setAttribute('id', message.id);
            if (message.message_reference) {
                // do not perform the fetch request on the message gen time
                // if we do messages will be noticeably slower to appear
                const replyWrapper = document.createElement('div');
                    replyWrapper.setAttribute('style', `
                        font-size: 0.7rem;
                        padding-top: 8px;
                        padding-left: 2.2rem;
                        margin-bottom: -1.25rem;
                    `)
                        const em = document.createElement('em');
                                em.innerText = 'Loading reply message';
                            replyWrapper.appendChild(em);
                    li.appendChild(replyWrapper); 
                (async () => {
                    const replied = await fetchMessage(message.message_reference.message_id);
                    replyWrapper.innerHTML = '';
                    const user = await client.getUserDisplay(replied.author.id, guildId);
                    replyWrapper.appendChild(Asset.UserAvatar(user, 'png', 20, `
                        display: inline;
                        width: 0.8rem;
                        height: 0.8rem;
                        margin-bottom: -0.2rem;
                        clip-path: circle();
                    `));
                    const name = document.createElement('div');
                        name.setAttribute('style', `
                            display: inline;
                            font-weight: bold;
                            padding-right: 4px;
                            padding-left: 2px;
                        `);
                        name.setAttribute('class', 'name-text');
                            name.innerText = user.name;
                        replyWrapper.appendChild(name);
                    const content = document.createElement('div');
                        content.setAttribute('style', `
                            display: inline;
                            overflow-x: hidden;
                        `);
                        content.setAttribute('class', 'content-wrapper');
                            content.innerText = replied.content.replaceAll('\n', '; ');
                        replyWrapper.appendChild(content);
                })();
            }
            if (compact) {
                const content = document.createElement('div');
                    content.setAttribute('style', `
                        padding-left: 2.2rem;
                    `)
                        content.innerHTML = await getRendered(message.content, false);
                    li.appendChild(content);
                return li;
            }
            const user = await client.getUserDisplay(message.author.id, guildId);
            li.appendChild(Asset.UserAvatar(user, 'png', 70, `
                display: inline;
                width: 2rem;
                height: 2rem;
                margin-bottom: -2.4rem;
                clip-path: circle();
            `));
            const textWrapper = document.createElement('div');
                textWrapper.setAttribute('style', `
                    padding-left: 2.2rem;
                `);
                    const name = document.createElement('div');
                        name.setAttribute('style', `
                            font-weight: bold;
                        `);
                        name.setAttribute('class', 'name-text');
                            name.innerText = user.name;
                        textWrapper.appendChild(name);
                    const content = document.createElement('div');
                        content.setAttribute('style', ``)
                        content.setAttribute('class', 'content-wrapper');
                            content.innerHTML = await getRendered(message.content, false);
                        textWrapper.appendChild(content);
                li.appendChild(textWrapper);
        return li;
}
function updateMessageEl(message) {
    const messageEl = document.getElementById(message.id);
    const pfp = messageEl.getElementsByTagName('img')[0];
    const name = messageEl.getElementsByClassName('name-text');
    const content = messageEl.getElementsByClassName('content-wrapper');
    pfp.src = Asset.UserAvatar(message.author);
    name.innerText = message.author.username;
    content.innerHTML = marked.parse(message.content);
}
const oneHour = 3600000
async function fillMessages() {
    client.messages = {};
    messageList.innerHTML = '';
    const res = await client.fromApi(`GET /channels/${channel}/messages`, { limit: 100 });
    if (res.message) throw res.message;
    for (const [idx, message] of Object.entries(res)) {
        const nextMessage = res[+(idx) +1];
        if (nextMessage) nextMessage.timestamp = new Date(message.timestamp);
        client.messages[message.id] = message;
        if (typeof message.timestamp === 'string') 
            message.timestamp = new Date(message.timestamp);
        const shouldCompact = nextMessage 
            && nextMessage.author.id === message.author.id
            && (nextMessage.timestamp - message.timestamp) < oneHour
            && !message.message_reference;
        messageList.appendChild(await makeMessageEl(message, shouldCompact));
    }
}
Object.defineProperty(window, 'channel', {
    get() {
        return location.hash?.slice?.(1) ?? null;
    },
    set(id) {
        location.hash = `#${id}`;
        fillMessages();
    } 
});
window.onhashchange = fillMessages;
client.reqVisUpdate = async (event, message) => {
    const first = messageList.children[0];
    switch (event) {
    case 'READY': 
        fillMessages();
        break;
    case 'MESSAGE_CREATE': {
        message.timestamp = new Date(message.timestamp);
        const lastMessage = client.messages[first.getAttribute('id')];
        const shouldCompact = lastMessage 
            && lastMessage.author.id === message.author.id
            && (lastMessage.timestamp - message.timestamp) < oneHour
            && !message.message_reference;
        messageList.insertBefore(await makeMessageEl(message, shouldCompact), first);
        lastEl(messageList.children).remove();
        break;
    }
    case 'MESSAGE_UPDATE':
        updateMessageEl(message);
        break;
    case 'MESSAGE_DELETE':
        message.ids = [message.id];
    case 'MESSAGE_DELETE_BULK':{
        for (const id of message.ids) {
            const messageEl = document.getElementById(id);
            if (!messageEl) continue;
            messageEl.remove();
        }
        const topMessage = messageList.children[0].getAttribute('id');
        const newMessages = await client.fromApi(`GET /channels/${channel}/messages`, { 
            limit: 100 - messageList.children.length, 
            before: topMessage 
        });
        let lastMessage = null;
        for (const message of newMessages) {
            client.messages[message.id] = message;
            message.timestamp = new Date(message.timestamp);
            const shouldCompact = lastMessage 
                && lastMessage.author.id === message.author.id
                && (lastMessage.timestamp - message.timestamp) < oneHour
                && !message.message_reference;
            messageList.appendChild(await makeMessageEl(message, shouldCompact));
            lastMessage = message;
        }
        break;
    }
    }
};
});