import { Asset } from "./asset-helper.js";
import { TimeStamp } from './elements/timestamp.js';
import { TextSpoiler } from './elements/spoiler.js';

const syntax = [
    [/^(#{1,3})\s+(.+?)$/mi, (level, content) => {
        switch (level) {
        default:
        case '#':
            return <h1>{content}</h1>
        case '##':
            return <h2>{content}</h2>
        case '###':
            return <h3>{content}</h3>
        }
    }],
    [/^-#\s+(.+?)$/mi, content => <h6>{content}</h6>],
    [/^>\s*(.+?)$/mi, content => <blockquote>{content}</blockquote>],
    [/^>>>\s*(.+?)\n\n*/mi, content => <blockquote>{content}</blockquote>],
    [/^(?: *(?:[0-9]+\.|-|\*)\s+.+?\n)+/mi, body => {
        const unWrap = body.matchAll(/^( *)([0-9\-\*\.]+)\s+(.+?)$/gmi);
        const nesting = [];
        const layers = [];
        let top = nesting;
        let level = -1;
        for (const m of unWrap) {
            const l = m[1].length / 2;
            if (level === -1) level = l;
            if (l > level) {
                const level = []
                top.push(level);
                top = level;
                layers.push(level);
            }
            if (l < level) {
                layers.pop();
                top = layers.at(-1);
            };
            top.push([/[0-9]/.test(m[2]), format(m[3], false)]);
        }

        function resolveDeep(layer) {
            const inner = layer
                .map(item => (Array.isArray(item) 
                    ? resolveDeep(item) 
                    : <li>{item}</li>));
            return layer[0][0] 
                ? <ol>{inner}</ol> 
                : <ul>{inner}</ul>;
        }
        return resolveDeep(nesting);
    }],
    [/^\*\*\*(.+?)\*\*\*/i, content => <strong><em>{content}</em></strong>],
    [/^\*\*(.+?)\*\*/i, content => <strong>{content}</strong>],
    [/^\*(.+?)\*/i, content => <em>{content}</em>],
    [/^```(?:([a-z]+)\n)?(.+?)```/is, (lang, code) => <code class={`external ${lang}`}>{code}</code>],
    [/^`(.+?)`/i, content => <code>{content}</code>],
    [/^~~(.+?)~~/i, content => <s>{content}</s>],
    [/^__(.+?)__/i, content => <u>{content}</u>],
    [/^\|\|(.+?)\|\|/i, content => <span is="text-spoiler">{content}</span>],
    [/^<@!?([0-9]+)>/i, async id => {
        const guildId = client.channels[channel]?.guild_id ?? 0;
        const user = await client.getUserDisplay(id, guildId);
        return <span class="mention"><em>@</em> {user.name}</span>;
    }],
    [/^<@&([0-9]+)>/i, async id => {
        const guildId = client.channels[channel]?.guild_id ?? 0;
        const role = client.guilds[guildId]?.roles?.[id];
        return role
            ? <span class="mention" style={`color: ${role.color}; opacity: 0.3;`}><em>@</em> {role.name}</span>
            : <span class="mention"><em>@</em> Invalid Role</span>;
    }],
    [/^<#([0-9]+)>/i, async id => {
        const channelName = client.channels[id]?.name;
        return channelName 
            ? <span class="mention"><em>#</em> {channelName}</span>
            : <span class="mention"><em>#</em> Invalid Channel</span>;
    }],
    [/^<id:([a-z]+)>/i, content => <span class="mention"><em>#</em> {content}</span>],
    [/^<(a?):([a-z]+):([0-9]+)>/i, async (animated, name, id) => {
        const image = Asset.CustomEmoji({ id }, animated ? 'gif' : 'png', 48);
        return <img title={name} class="emoji" src={image}></img>;
    }],
    [/^\[(.+?)\]\(<?https?:\/\/[^\s]*>?\)/i, (title, url) => <a href={`/redirect?target=${url}`}>{title}</a>],
    [/^<t:([0-9]+)(:[tTdDfFR])?>/i, (time, style) => <TimeStamp t={time} s={style}></TimeStamp>],
    [/^<?https?:\/\/[^\s]*>?/i, url => <a href={`/redirect?target=${url}`}>{url}</a>],
    [/^\n/i, '<br>'],
]
/** @param {string} text */
export async function format(text, wrap = true) {
    let out = '';
    let cur = 0;
    while (cur < text.length) {
        const start = cur;
        for (const [match, maker] of syntax) {
            if (match.test(text.slice(cur))) {
                const m = text.slice(cur).match(match);
                out += text.slice(cur, cur + m.index);
                cur += m.index + m[0].length;
                const formated = [m[0], ...await Promise.all(m.slice(1).map(format))];
                out += await maker(...formated.slice(formated.length <= 1 ? 0 : 1));
                break;
            }
        }
        if (start === cur) {
            out += text[cur];
            cur++;
        }
    }
    out += text.slice(cur);
    return wrap ? <div class="message-render">{out}</div> : out;
}