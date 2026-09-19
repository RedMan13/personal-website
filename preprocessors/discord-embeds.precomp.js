const { Tokenizer, PrecompUtils } = require('builder');
const { parseTokens, makeTokens, grouping } = require('./javascript-xml.precomp');

function makeJSON(token, util) {
    if (typeof token === 'string') return;
    token.attributes = token.attributes.map(attr => [attr[0], attr[1].slice(1, -1)]);
    switch (token.tagname) {
    case 'embed':
    case 'container': {
        const components = token.children.map(makeJSON).filter(Boolean);
        const colorStr = token.attributes.find(attr => attr[0] === 'color' || attr[0] === 'accent');
        const color = colorStr && parseInt(colorStr[1].slice(1, 7), 16);
        return {
            type: 17,
            components,
            accent_color: color,
            spoiler: token.attributes.some(attr => attr[0] === 'spoiler')
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
            divider: attributes.some(attr => attr[0] === 'solid'),
            spacing: attributes.some(attr => attr[0] === 'large') +1
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
        const url = token.attributes.find(attr => attr[0] === 'src' || attr[0] === 'url' || attr[0] === 'source');
        if (!url) throw new SyntaxError('Media url is not optional!');
        const desc = token.attributes.find(attr => attr[0] === 'title' || attr[0] === 'description');
        return {
            media: { url: url[1] },
            description: desc?.[1],
            spoiler: token.attributes.some(attr => attr[0] === 'spoiler')
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
        const url = token.attributes.find(attr => attr[0] === 'src' || attr[0] === 'url' || attr[0] === 'source');
        if (!url) throw new SyntaxError('Media url is not optional!');
        const desc = token.attributes.find(attr => attr[0] === 'title' || attr[0] === 'description');
        return {
            type: 11,
            media: { url: url[1] },
            description: desc?.[1],
            spoiler: token.attributes.some(attr => attr[0] === 'spoiler')
        }
    }
    case 'action-row':
    case 'row': {
        const components = token.children.map(makeJSON).filter(Boolean);
        if (components.some(child => ![2,3,5,6,7,8].includes(child.type)))
            throw new SyntaxError('Action rows can only contain one of button, string select, user select, role select, mentionable select, channel select');
        if (components.length > 5)
            throw new SyntaxError('Cannot have more then five buttons in an action row');
        return {
            type: 1,
            components
        }
    }
    case 'button': {
        const style = token.attributes.find(attr => attr[0] === 'style');
        if (!style) throw new SyntaxError('Buttons must include a style!');
        const label = token.children.join(' ');
        if (label && style[1] === 'premium')
            throw new SyntaxError('Premium buttons can not have labels');
        const emojiStr = token.attributes.find(attr => attr[0] === 'emoji');
        const emoji = emojiStr 
            && (/^<(?<animated>a)?:(?<name>[a-z0-9_~]*):(?<id>[0-9]+)>$/i.exec(emojiStr[1]) 
                ?? { name: emojiStr[1] });
        if (emoji && style[1] === 'premium')
            throw new SyntaxError('Premium buttons can not have emojis');
        emoji.animated = !!emoji.animated;
        const customId = token.attributes.find(attr => attr[0] === 'id' || attr[0] === 'custom-id' || attr[0] === 'sku-id');
        if (customId && style[1] === 'link')
            throw new SyntaxError('Link buttons can not have custom ids');
        if (!customId && style[1] !== 'link')
            throw new SyntaxError('None-link buttons must have custom ids');
        const url = token.attributes.find(attr => attr[0] === 'url');
        if (url && style[1] !== 'link')
            throw new SyntaxError('Only link buttons are allowed to have links')
        return {
            type: 2,
            style: ['primary', 'secondary', 'success', 'danger', 'link', 'premium'].indexOf(style[1]) +1,
            label: label?.[1],
            emoji,
            custom_id: style[1] !== 'premium' && customId?.[1],
            sku_id: style[1] === 'premium' && customId?.[1],
            url: url?.[1],
            disabled: token.attributes.some(attr => attr[0] === 'disabled')
        }
    }
    case 'option': {
        const customId = token.attributes.find(attr => attr[0] === 'id' || attr[0] === 'value');
        if (!customId[1]) throw new SyntaxError('Selection options must have values!');
        const desc = token.attributes.find(attr => attr[0] === 'title' || attr[0] === 'description');
        const emojiStr = token.attributes.find(attr => attr[0] === 'emoji');
        const emoji = emojiStr 
            && (/^<(?<animated>a)?:(?<name>[a-z0-9_~]*):(?<id>[0-9]+)>$/i.exec(emojiStr[1]) 
                ?? { name: emojiStr[1] });
        emoji.animated = !!emoji.animated;

        return {
            label: token.children.join(' '),
            value: customId[1],
            description: desc[1],
            emoji,
            default: token.attributes.some(attr => attr[0] === 'default')
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
        const customId = token.attributes.find(attr => attr[0] === 'id' || attr[0] === 'custom-id' || attr[0] === 'sku-id');
        if (!customId) throw new SyntaxError('Selectors must have custom ids');
        const placeholder = token.attributes.find(attr => attr[0] === 'placeholder');
        const min = token.attributes.find(attr => attr[0] === 'min' || attr[0] === 'min-values');
        const max = token.attributes.find(attr => attr[0] === 'max' || attr[0] === 'max-values');
        const required = token.attributes.some(attr => attr[0] === 'required');
        if (required && min && min[1] < 1) throw new SyntaxError('The minimum select count must be greater then zero if required!');
        return {
            type: { 'string-select': 3, 'user-select': 5, 'role-select': 6, 'mentionable-select': 7, 'channel-select': 8 }[token.tagname],
            options: token.tagname === 'string-select' && options,
            default_values: token.tagname !== 'string-select' && options,
            custom_id: customId[1],
            placeholder: placeholder?.[1],
            min_values: min?.[1],
            max_values: max?.[1], 
            required,
            disabled: token.attributes.some(attr => attr[0] === 'disabled')
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
        const json = { component: makeJSON(head[0]) };
        util.replace(start, end, `<script id="discord:component-embed" type="application/json">${JSON.stringify(json)}</script>`);
    }
}
module.exports.matchFile = util => util.matchType('php,html,ejs');
module.exports.weight = 4;