export function getMessageInput(client) {

}

const formatMarks = [
    '***',
    '**',
    '*',
    '\n',
    '`',
    '~~',
    '__',
]
const markInfs = {
    '***': [['*', '**'], '<strong><em>'],
    '**': [['**'], '<strong>', '</strong>'],
    '*': [['*'], '<em>', '</em>'],
    '\n': [[], '<br>'],
    '```': [['```'], '<code class="external ', '</code>'],
    '`': [['`'], '<code>', '</code>'],
    '~~': [['~~'], '<s>', '</s>'],
    '__': [['__'], '<u>', '</u>']
}
function renderInline(chunk, keepSymbol) {
    if (chunk.startsWith('\n')) chunk = chunk.slice(1);
    let str = '';
    const keys = [];
    for (let i = 0, c = chunk[0]; i < chunk.length; c = chunk[++i]) {
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
        if (mark === '```') {
            const lang = chunk.slice(i).match(/[a-z0-9]*/i)[0];
            str += `${lang}">`
        }
        if (mark === '[') {

        }
    }

    return str;
}

const lineMatchs = {
    header: /^(?<level>#{1,3})\s+(?<content>.*)/,
    quote: /^>\s+(?<content>.*)/,
    list: /^((?<idx>[0-9]+)\.|\s*[\-*]\s+])(?<content>.*)/,
    blockquote: /^>>>\s+(?<content>.*)/
};
export function getRendered(content, keepSymbol) {
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
            out += renderInline(inlineHold) + '</blockquote>';
            holdForBlock = false;
            inlineHold = '';
        }
        let found = false;
        for (const [idx, regex] of Object.entries(lineMatchs)) {
            const m = line.match(regex);
            found = !!m;
            if (!m) continue;
            if (inlineHold) {
                out += renderInline(inlineHold);
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
                const content = keepSymbol ? renderInline(m[0]) : renderInline(m.groups.content)
                out += `<h${l}>${content}</h${l}>`;
                break;
            case 'quote':
                out += `<blockquote>${renderInline(m.groups.content)}</blockquote>`;
                break;
            case 'list':
                if (renderingLi) {
                    out += `<li>${renderInline(m.groups.content)}</li>`
                    break;
                }
                const listType = m.groups.idx ? 'ol' : 'ul';
                renderingLi = listType;
                out += `<${listType}><li>${renderInline(m.groups.content)}</li>`;
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
    out += renderInline(inlineHold, keepSymbol);
    return out + '</div>';
}