import { Asset } from "./asset-helper.js";

const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];
const weekNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dateStyle = {
    't': date => `${date.getHour()}:${date.getMinute()}`,
    'T': date => `${date.getHour()}:${date.getMinute()}:${date.getSecond()}`,
    'd': date => `${date.getDate()}/${date.getMonth() +1}/${date.getFullYear()}`,
    'D': date => `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`,
    'f': date => `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()} ${date.getHour()}:${date.getMinute()}`,
    'F': date => `${weekNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()} ${date.getHour()}:${date.getMinute()}`,
    'R': date => {
        const now = new Date();
        const years = now.getYear() - date.getYear();
        const months = now.getMonth() - date.getMonth();
        const days = now.getDate() - date.getDate();
        const hours = now.getHour() - date.getHour();
        const minutes = now.getMinute() - date.getMinute();
        const seconds = now.getSecond() - date.getSecond();
        if (years !== 0)        return years >= 0   ? `in ${years} years`     :     `${years} years ago`;
        else if (months !== 0)  return months >= 0  ? `in ${months} months`   :   `${months} months ago`;
        else if (days !== 0)    return days >= 0    ? `in ${days} days`       :       `${days} days ago`;
        else if (hours !== 0)   return hours >= 0   ? `in ${hours} hours`     :     `${hours} hours ago`;
        else if (minutes !== 0) return minutes >= 0 ? `in ${minutes} minutes` : `${minutes} minutes ago`;
        else if (seconds !== 0) return seconds >= 0 ? `in ${seconds} seconds` : `${seconds} seconds ago`;
        return 'now';
    }
}
class HTMLTimeStamp extends HTMLElement {
    static observedAttributes = ['t', 's'];
    #display = null;
    #intr = null;

    constructor() {
        super();

        this.time = Date.now();
        this.style = 'R';
    }
    get time() { return new Date(this.getAttribute('t')) }
    set time(t) { this.setAttribute('t', t); }

    get style() { return this.getAttribute('s') }
    set style(s) { this.setAttribute('s', s) }

    render() {
        if (!this.#display) this.#display = this.attachShadow({ mode: 'open' });
        if (!this.#intr) this.#intr = setInterval(this.render, 1000);
        console.log(this.#display);
        this.#display.innerText = (dateStyle[this.style] ?? dateStyle['R'])(this.time);
    }
    
    disconnectedCallback() { if (this.#intr) clearInterval(this.#intr); this.#intr = null; }
    conectedCallback = HTMLTimeStamp.prototype.render;
    attributeChangedCallback = HTMLTimeStamp.prototype.render;
}
customElements.define('time-stamp', HTMLTimeStamp)

export function getMessageInput() {

}

const formatMarks = [
    '***',
    '**',
    '*',
    '\n',
    '`',
    '~~',
    '__'
]
const markInfs = {
    '**': [['**'], '<strong>', '</strong>'],
    '*': [['*'], '<em>', '</em>'],
    '\n': [[], '<br>'],
    '```': [['```'], '<code class="external ', '</code>'],
    '`': [['`'], '<code>', '</code>'],
    '~~': [['~~'], '<s>', '</s>'],
    '__': [['__'], '<u>', '</u>']
}
async function renderInline(chunk, keepSymbol) {
    if (chunk.startsWith('\n')) chunk = chunk.slice(1);
    let str = '';
    const keys = [];
    for (let i = 0, c = chunk[0]; i < chunk.length; c = chunk[++i]) {
        // handle the discord speciality thing + urls
        const m = chunk.slice(i).match(/<((?<type>@!?|@&|#|a?:[_a-zA-Z]+:)(?<id>[0-9]+)|t:(?<timestamp>[0-9]+)(?<style>:[tTdDfFR])?|id:(?<guildnav>[a-zA-Z]+))>|\[:[_a-zA-Z]+:\]\(https:\/\/media\.discordapp\.net\/emojis\/(?<fakeEId>[0-9]+).*?\)|\[(?<coverText>.*?)\]\((?<hyperlink><.*?>|.*?)\)|(?<url><?https?:\/\/[^\s]*>?)/);
        if (m) {
            const { type,id, fakeEId, timestamp,style, guildnav, coverText,hyperlink, url} = m.groups;
            const urlString = hyperlink ?? url;
            const realUrl = (() => {
                try { 
                    return new URL(urlString[0] === '<' ? urlString.slice(1, -1) : urlString);
                } catch (err) {
                    return null;
                }
            })();
            let valid = false;
            if (realUrl && coverText) {
                str += `<a href="/redirect.php?target=${realUrl}">${coverText}</a>`;
                valid = true;
            }
            if (realUrl) {
                str += `<a href="/redirect.php?target=${realUrl}">${realUrl}</a>`;
                valid = true;
            }
            if (timestamp) {
                str += `<time-stamp t="${timestamp}" s="${style}"></time-stamp>`;
                valid = true;
            }
            if (guildnav) {
                str += `<span class="mention"><em>#<em> ${guildnav}</span>`;
                valid = true;
            }
            if (id || fakeEId) {
                const guildId = client.channels[channel].guild_id;
                switch (type) {
                case '@':
                case '@!':
                    const user = await client.getUserDisplay(id, guildId);
                    str += `<span class="mention"><em>@</em> ${user.name}</span>`;
                    break;
                case '@&':
                    const role = client.guilds[guildId].roles[id];
                    if (!role) {
                        str += '<span class="mention"><em>@</em> Invalid Role</span>';
                        break;
                    }
                    str += `<span class="mention" style="color: ${role.color}; opacity: 0.3;"><em>@</em> ${role.name}</span>`;
                    break;
                case '#':
                    const channelName = client.channels[id].name;
                    if (!channelName) {
                        str += `<span class="mention"><em>#</em> Invalid Channel</span>`;
                    }
                    str += `<span class="mention"><em>#</em> ${channelName}</span>`;
                    break;
                default:
                    const emoji = { id };
                    const gifPng = type[0] === 'a' ? 'gif' : 'png';
                    str += `<img title="${id}" class="emoji" src="${Asset.CustomEmoji(emoji, gifPng, 48)}"></img>`;
                    break;
                }
                valid = true;
            }
            if (valid) i += m[0].length -1;
        }
        
        const mark = formatMarks.find(mark => mark[0] === c && chunk.slice(i).startsWith(mark));
        if (!mark) {
            str += c;
            continue;
        }
        if (keepSymbol && mark !== '\n') str += mark;
        const [markKeys, open, close] = markInfs[mark] ?? [];
        if (mark && !markKeys) continue;
        if (keys[0] === mark && close) {
            keys.shift();
            str += close;
            continue;
        }
        keys.unshift(...markKeys);
        str += open;
        i += mark.length -1;
        if (mark === '```') {
            const lang = chunk.slice(i).match(/[a-z0-9]*/i)[0];
            str += `${lang}">`
        }
    }

    return str;
}

const lineMatchs = {
    header: /^(?<level>#{1,3})\s+(?<content>.*)/,
    quote: /^>\s+(?<content>.*)/,
    list: /^((?<idx>[0-9]+)\.|\s*[\-*]\s+)(?<content>.*)/,
    blockquote: /^>>>\s+(?<content>.*)/
};
export async function getRendered(content, keepSymbol) {
    const lines = content.split(/\r?\n\r?/gi);
    let out = '<div class="message-render">';
    let holdForBlock = false;
    let renderingLi = null;
    let inlineHold = '';
    for (const line of lines) {
        if (holdForBlock && line) {
            inlineHold += '\n' + line;
            continue;
        }
        if (holdForBlock && !line) {
            out += await renderInline(inlineHold) + '</blockquote>';
            holdForBlock = false;
            inlineHold = '';
        }
        let found = false;
        for (const [idx, regex] of Object.entries(lineMatchs)) {
            const m = line.match(regex);
            found = !!m;
            if (!m) continue;
            if (inlineHold) {
                out += await renderInline(inlineHold);
                holdForBlock = false;
                inlineHold = '';
            }
            if (renderingLi && idx !== 'list') {
                out += `</${renderingLi}>`;
                renderingLi = false;
            }
            switch (idx) {
            case 'header':
                const l = m.groups.level.length;
                const content = keepSymbol ? await renderInline(m[0]) : await renderInline(m.groups.content)
                out += `<h${l +2}>${content}</h${l +2}>`;
                break;
            case 'quote':
                out += `<blockquote>${await renderInline(m.groups.content)}</blockquote>`;
                break;
            case 'list':
                if (renderingLi) {
                    out += `<li>${await renderInline(m.groups.content)}</li>`
                    break;
                }
                const listType = m.groups.idx ? 'ol' : 'ul';
                renderingLi = listType;
                out += `<${listType}><li>${await renderInline(m.groups.content)}</li>`;
                break;
            }
            break;
        }
        if (!found) {
            if (renderingLi) {
                out += `</${renderingLi}>`;
                renderingLi = false;
            }
            inlineHold += '\n' + line;
        }
    }
    out += await renderInline(inlineHold, keepSymbol);
    return out + '</div>';
}