const { Tokenizer, PrecompUtils } = require('builder');
const { parseTokens, makeTokens, grouping } = require('./javascript-xml.precomp');

function makeJSON(token) {
    if (typeof token === 'string') return;
    switch (token.tagname) {
    case 'embed':
    case 'container': {
        const components = token.children.map(makeJSON).filter(Boolean);
        const colorStr = token.attributes.find(attr => attr.key === 'color' || attr.key === 'accent');
        const color = colorStr && parseInt(colorStr.value.slice(1, 7), 16);
        return {
            type: 17,
            components,
            accent_color: color,
            spoiler: token.attributes.some(attr => attr.key === 'spoiler')
        }
    }
    case 'text-display':
    case 'text':
        return {
            type: 10,
            content: token.children.join(' ')
        }
    case 'seperator':
        return {
            type: 14,
            divider: attributes.some(attr => attr.key === 'solid'),
            spacing: attributes.some(attr => attr.key === 'large') +1
        }
    case 'media-gallery':
    case 'media':
        const children = token.children.map(makeJSON).filter(Boolean);
        return {
            type: 12,
            items: children
        }
    case 'audio':
    case 'video':
    case 'image':
    case 'img': {
        const url = token.attributes.find(attr => attr.key === 'src' || attr.key === 'url' || attr.key === 'source');
        if (!url) throw new SyntaxError('Media url is not optional!');
        const desc = token.attributes.find(attr => attr.key === 'title' || attr.key === 'description');
        return {
            media: { url: url.value },
            description: desc?.value,
            spoiler: token.attributes.some(attr => attr.key === 'spoiler')
        }
    }
    case 'section': {
        const components = token.children.map(makeJSON).filter(Boolean);
        const accessory = components.pop();
        if (![11,2].includes(accessory.type))
            throw new SyntaxError('Section accessories can only be one of thumbnail, button.');
        if (components.some(child => child.type !== 10))
            throw new SyntaxError('Section bodies can only be made of text.');
        return {
            type: 9,
            components,
            accessory
        }
    }
    case 'thumbnail': {
        const url = token.attributes.find(attr => attr.key === 'src' || attr.key === 'url' || attr.key === 'source');
        if (!url) throw new SyntaxError('Media url is not optional!');
        const desc = token.attributes.find(attr => attr.key === 'title' || attr.key === 'description');
        return {
            type: 11,
            media: { url: url.value },
            description: desc?.value,
            spoiler: token.attributes.some(attr => attr.key === 'spoiler')
        }
    }
    case 'action-row':
    case 'row': {
        const components = token.children.map(makeJSON).filter(Boolean);
        if (components.some(child => ![2,3,5,6,7,8].includes(child.type)))
            throw new SyntaxError('Action rows can only contain one of button, string select, user select, role select, mentionable select, channel select');
        return {
            type: 1,
            components
        }
    }
    case 'button': {
        const style = token.attributes.find(attr => attr.key === 'style');
        if (!style) throw new SyntaxError('Buttons must include a style!');
        const label = token.children.join(' ');
        if (label && style.value === 'premium')
            throw new SyntaxError('Premium buttons can not have labels');
        const emojiStr = token.attributes.find(attr => attr.key === 'emoji');
        const emoji = emojiStr 
            && (/^<(?<animated>a)?:(?<name>[a-z0-9_~]*):(?<id>[0-9]+)>$/i.exec(emojiStr.value) 
                ?? { name: emojiStr.value });
        if (emoji && style.value === 'premium')
            throw new SyntaxError('Premium buttons can not have emojis');
        emoji.animated = !!emoji.animated;
        const customId = token.attributes.find(attr => attr.key === 'id' || attr.key === 'custom-id' || attr.key === 'sku-id');
        if (customId && style.value === 'link')
            throw new SyntaxError('Link buttons can not have custom ids');
        if (!customId && style.value !== 'link')
            throw new SyntaxError('None-link buttons must have custom ids');
        const url = token.attributes.find(attr => attr.key === 'url');
        if (url && style.value !== 'link')
            throw new SyntaxError('Only link buttons are allowed to have links')
        return {
            type: 2,
            style: ['primary', 'secondary', 'success', 'danger', 'link', 'premium'].indexOf(style.value) +1,
            label: label?.value,
            emoji,
            custom_id: style.value !== 'premium' && customId?.value,
            sku_id: style.value === 'premium' && customId?.value,
            url: url?.value,
            disabled: token.attributes.some(attr => attr.key === 'disabled')
        }
    }
    case 'option': {
        const customId = token.attributes.find(attr => attr.key === 'id' || attr.key === 'value');
        if (!customId.value) throw new SyntaxError('Selection options must have values!');
        const desc = token.attributes.find(attr => attr.key === 'title' || attr.key === 'description');
        const emojiStr = token.attributes.find(attr => attr.key === 'emoji');
        const emoji = emojiStr 
            && (/^<(?<animated>a)?:(?<name>[a-z0-9_~]*):(?<id>[0-9]+)>$/i.exec(emojiStr.value) 
                ?? { name: emojiStr.value });
        emoji.animated = !!emoji.animated;

        return {
            label: token.children.join(' '),
            value: customId.value,
            description: desc.value,
            emoji,
            default: token.attributes.some(attr => attr.key === 'default')
        }
    }
    case 'user': return { type: 'user', id: token.children.join(' ') }
    case 'role': return { type: 'role', id: token.children.join(' ') }
    case 'channel': return { type: 'channel', id: token.children.join(' ') }

    case 'string-select':
    case 'user-select':
    case 'role-select':
    case 'channel-select':
    case 'mentionable-select':
        const options = token.children.map(makeJSON).filter(Boolean);
        const customId = token.attributes.find(attr => attr.key === 'id' || attr.key === 'custom-id' || attr.key === 'sku-id');
        if (!customId) throw new SyntaxError('Selectors must have custom ids');
        const placeholder = token.attributes.find(attr => attr.key === 'placeholder');
        const min = token.attributes.find(attr => attr.key === 'min' || attr.key === 'min-values');
        const max = token.attributes.find(attr => attr.key === 'max' || attr.key === 'max-values');
        const required = token.attributes.some(attr => attr.key === 'required');
        if (required && min && min.value < 1) throw new SyntaxError('The minimum select count must be greater then zero if required!');
        return {
            type: { 'string-select': 3, 'user-select': 5, 'role-select': 6, 'mentionable-select': 7, 'channel-select': 8 }[token.tagname],
            options: token.tagname === 'string-select' && options,
            default_values: token.tagname !== 'string-select' && options,
            custom_id: customId.value,
            placeholder: placeholder?.value,
            min_values: min?.value,
            max_values: max?.value, 
            required,
            disabled: token.attributes.some(attr => attr.key === 'disabled')
        }
    }
}
module.exports = async function(util) {
    util.tokenize({
        open: /^<embed/i,                                   
        close: /^<\/embed>/i
    }, ['open', 'close']);
    const tok = new Tokenizer('', makeTokens(util, false));

    for (const tokens of util.tokens) {
        const start = tokens[0].start;
        const end = tokens[1].end;
        tok.setString(util.file.slice(start, end));
        const phoTool = new PrecompUtils('', tok.str, util.manager);
        const head = parseTokens(tok.getGroups(grouping), phoTool, false);
        const json = makeJSON(head[0]);
        util.replace(start, end, `<script id="discord:component-embed" type="application/json">${JSON.stringify(json)}</script>`)
        
    }
}
module.exports.matchFile = util => util.matchType('php,html,ejs');
module.exports.weight = 4;