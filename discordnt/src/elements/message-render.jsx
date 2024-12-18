import { Asset } from "../api/asset-helper.js";
import { TimeStamp } from './timestamp.jsx';
import { TextSpoiler } from './spoiler.jsx';

const syntax = [
    [/^(#{1,3})\s+(.+?)$/mi, [false, true], (level, content) => {
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
    [/^-#\s+(.+?)$/mi, [true], content => <h6>{content}</h6>],
    [/^>\s*(.+?)$/mi, [true], content => <blockquote>{content}</blockquote>],
    [/^>>>\s*(.+?)\n\n*/mi, [true], content => <blockquote>{content}</blockquote>],
    [/^(?: *(?:[0-9]+\.|-|\*)\s+.+?\n)+/mi, async body => {
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
            top.push([/[0-9]/.test(m[2]), await format(m[3], false)]);
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
    [/^\*\*\*(.+?)\*\*\*/i, [true], content => <strong><em>{content}</em></strong>],
    [/^\*\*(.+?)\*\*/i, [true], content => <strong>{content}</strong>],
    [/^\*(.+?)\*/i, [true], content => <em>{content}</em>],
    [/^```(?:([a-z]+)\n)?(.+?)```/is, [false, true], (lang, code) => <code class={`external ${lang}`}>{code}</code>],
    [/^`(.+?)`/i, [true], content => <code>{content}</code>],
    [/^~~(.+?)~~/i, [true], content => <s>{content}</s>],
    [/^__(.+?)__/i, [true], content => <u>{content}</u>],
    [/^\|\|(.+?)\|\|/i, [true], content => <TextSpoiler>{content}</TextSpoiler>],
    [/^<@!?([0-9]+)>/i, [false], async id => 
        <span class="mention"><em>@</em> {client.askFor('getMember', id).name}</span>],
    [/^<@&([0-9]+)>/i, [false], async id => {
        const role = client.askFor('Roles.get', id);
        return role
            ? <span class="mention" style={`color: ${role.color}; opacity: 0.3;`}><em>@</em> {role.name}</span>
            : <span class="mention"><em>@</em> Invalid Role</span>;
    }],
    [/^<#([0-9]+)>/i, [false], async id => {
        const channelName = client.askFor('Channels.get', id);
        return channelName 
            ? <span class="mention"><em>#</em> {channelName}</span>
            : <span class="mention"><em>#</em> Invalid Channel</span>;
    }],
    [/^<id:([a-z]+)>/i, [false], content => <span class="mention"><em>#</em> {content}</span>],
    [/^<(a?):([a-z]+):([0-9]+)>/i, [false, false, false], async (animated, name, id) => {
        const image = Asset.CustomEmoji({ id }, animated ? 'gif' : 'png', 48);
        return <img title={name} class="emoji" src={image}></img>;
    }],
    [/^\[(.+?)\]\(<?(https?:\/\/[^\s]*)>?\)/i, [true, false], (title, url) => <a href={`/redirect?target=${url}`}>{title}</a>],
    [/^<t:([0-9]+):([tTdDfFR])?>/i, [false, false], (time, style) => <TimeStamp t={time} s={style}></TimeStamp>],
    [/^<?(https?:\/\/[^\s]*)>?/i, [false], url => <a href={`/redirect?target=${url}`}>{url}</a>],
    [/^\n/i, () => <br/>],
]
/** @param {string} text */
export async function format(text, wrap = true) {
    const out = [''];
    for (let i = 0; i < text.length; i++) {
        const test = text.slice(i);
        const form = syntax.find(([reg]) => reg.test(test));
        if (!form) {
            out[out.length -1] += text[i];
            continue;
        }
        const match = form[0].exec(test);
        const el = match.length <= 1
            ? await form[1](match[0])
            : await form[2](
                ...(await Promise.all(match
                    .slice(1)
                    .map((m,i) => (form[1][i] ?? true)
                        ? format(m, false)
                        : m))),
                match.groups
            );
        if (out.at(-1) === '') out.pop();
        out.push(el, '');
        i += match[0].length -1;
    }
    if (out.at(-1) === '') out.pop();
    return wrap ? <div class="message-render">{out}</div> : out;
}