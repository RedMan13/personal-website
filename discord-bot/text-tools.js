const Canvas = require('canvas');
const Tokenizer = require('./tokenizer');

/** @typedef {'preserve-word'|'break-longest'|'break-anywhere'} BreakRule */
/** @typedef {{
 *      patternQuality: 'fast' | 'good' | 'best' | 'nearest' | 'bilinear'
 *      imageSmoothingEnabled: boolean;
 *      globalCompositeOperation: GlobalCompositeOperation;
 *      globalAlpha: number;
 *      shadowColor: string;
 *      miterLimit: number;
 *      lineWidth: number;
 *      lineCap: CanvasLineCap;
 *      lineJoin: CanvasLineJoin;
 *      lineDashOffset: number;
 *      shadowOffsetX: number;
 *      shadowOffsetY: number;
 *      shadowBlur: number;
 *      antialias: 'default' | 'gray' | 'none' | 'subpixel'
 *      textDrawingMode: 'path' | 'glyph'
 *      quality: 'fast' | 'good' | 'best' | 'nearest' | 'bilinear'
 *      fillStyle: string | CanvasGradient | CanvasPattern;
 *      strokeStyle: string | CanvasGradient | CanvasPattern;
 *      font: string;
 *      textBaseline: CanvasTextBaseline;
 *      textAlign: CanvasTextAlign;
 *      direction: 'ltr' | 'rtl';
 *      lang: string;
 * }} CanvasTextConfig */
/** @typedef {{
 *     type: 'image' | 'text' | 'config',
 *     width?: number,
 *     breaks?: boolean,
 *     value: string | Canvas.Image | CanvasTextConfig
 * }} FormattingComponent */
/**
 * Applies a canvas text config to the canvas
 * @param {CanvasRenderingContext2D} ctx 
 * @param {CanvasTextConfig} config 
 */
function applyConfig(ctx, config) {
    if ('patternQuality' in config) ctx.patternQuality = config.patternQuality;
    if ('imageSmoothingEnabled' in config) ctx.imageSmoothingEnabled = config.imageSmoothingEnabled;
    if ('globalCompositeOperation' in config) ctx.globalCompositeOperation = config.globalCompositeOperation;
    if ('globalAlpha' in config) ctx.globalAlpha = config.globalAlpha;
    if ('shadowColor' in config) ctx.shadowColor = config.shadowColor;
    if ('miterLimit' in config) ctx.miterLimit = config.miterLimit;
    if ('lineWidth' in config) ctx.lineWidth = config.lineWidth;
    if ('lineCap' in config) ctx.lineCap = config.lineCap;
    if ('lineJoin' in config) ctx.lineJoin = config.lineJoin;
    if ('lineDashOffset' in config) ctx.lineDashOffset = config.lineDashOffset;
    if ('shadowOffsetX' in config) ctx.shadowOffsetX = config.shadowOffsetX;
    if ('shadowOffsetY' in config) ctx.shadowOffsetY = config.shadowOffsetY;
    if ('shadowBlur' in config) ctx.shadowBlur = config.shadowBlur;
    if ('antialias' in config) ctx.antialias = config.antialias;
    if ('textDrawingMode' in config) ctx.textDrawingMode = config.textDrawingMode;
    if ('quality' in config) ctx.quality = config.quality;
    if ('fillStyle' in config) ctx.fillStyle = config.fillStyle;
    if ('strokeStyle' in config) ctx.strokeStyle = config.strokeStyle;
    if ('font' in config) ctx.font = config.font;
    if ('direction' in config) ctx.direction = config.direction;
    if ('lang' in config) ctx.lang = config.lang;
}
/**
 * Creates a config component from the current context
 * @param {CanvasRenderingContext2D} ctx 
 * @returns {FormattingComponent}
 */
function makeConfig(ctx) {
    return {
        type: 'config',
        value: {
            patternQuality: ctx.patternQuality,
            imageSmoothingEnabled: ctx.imageSmoothingEnabled,
            globalCompositeOperation: ctx.globalCompositeOperation,
            globalAlpha: ctx.globalAlpha,
            shadowColor: ctx.shadowColor,
            miterLimit: ctx.miterLimit,
            lineWidth: ctx.lineWidth,
            lineCap: ctx.lineCap,
            lineJoin: ctx.lineJoin,
            lineDashOffset: ctx.lineDashOffset,
            shadowOffsetX: ctx.shadowOffsetX,
            shadowOffsetY: ctx.shadowOffsetY,
            shadowBlur: ctx.shadowBlur,
            antialias: ctx.antialias,
            textDrawingMode: ctx.textDrawingMode,
            quality: ctx.quality,
            fillStyle: ctx.fillStyle,
            strokeStyle: ctx.strokeStyle,
            font: ctx.font,
            direction: ctx.direction,
            lang: ctx.lang
        }
    }
}
/**
 * Computes the total height for a line of components
 * @param {CanvasRenderingContext2D} ctx 
 * @param {FormattingComponent[]} components 
 * @returns {number}
 */
function getLineHeight(ctx, components) {
    const measures = ctx.measureText('abcdefghijklmnopqrstuvwxyz_`|');
    let lineHeight = measures.actualBoundingBoxAscent + measures.actualBoundingBoxDescent;
    let height = 0;
    for (let i = 0; i < components.length; i++) {
        switch (components[i].type) {
        case 'text':
            const measures = ctx.measureText('abcdefghijklmnopqrstuvwxyz_`|');
            lineHeight = measures.actualBoundingBoxAscent + measures.actualBoundingBoxDescent;
            break;
        case 'config': applyConfig(ctx, components[i].value); break;
        }
        height = Math.max(height, lineHeight);
    }
    return height;
}
/**
 * Draws a list of components at a specific location
 * @param {CanvasRenderingContext2D} ctx 
 * @param {FormattingComponent[]} components 
 * @param {number} x 
 * @param {number} y 
 * @param {boolean} fill 
 * @param {boolean} stroke 
 * @param {CanvasTextBaseline} yAlign 
 * @param {number} height 
 */
function drawComponents(ctx, components, x,y, fill, stroke, yAlign, height) {
    const measures = ctx.measureText('abcdefghijklmnopqrstuvwxyz_`|');
    let lineHeight = measures.actualBoundingBoxAscent + measures.actualBoundingBoxDescent;
    for (let i = 0; i < components.length; i++) {
        const measures = ctx.measureText('abcdefghijklmnopqrstuvwxyz_`|');
        lineHeight = measures.actualBoundingBoxAscent + measures.actualBoundingBoxDescent;
        let cy = y;
        switch (yAlign) {
        case 'hanging':
        case 'top': break;
        case 'alphabetic':
        case 'middle': cy -= (height - lineHeight) / 2; break;
        case 'ideographic':
        case 'bottom': cy -= height - lineHeight; break;
        }
        switch (components[i].type) {
        case 'image':
            // scale image width to fit inside line height
            const realWidth = (components[i].value.width / components[i].value.height) * lineHeight;
            x += lineHeight / 2
            x -= realWidth / 2;
            ctx.drawImage(components[i].value, x,cy, realWidth, lineHeight);
            x += realWidth / 2;
            x += lineHeight / 2;
            break;
        case 'text':
            if (fill) ctx.fillText(components[i].value, x,cy);
            if (stroke) ctx.strokeText(components[i].value, x,cy);
            x += components[i].width;
            break;
        case 'config': applyConfig(ctx, components[i].value); break;
        }
    }
} 
/**
 * Draws styled text, including word-wrapping
 * @param {Canvas.CanvasRenderingContext2D} ctx 
 * @param {BreakRule} breakRule 
 * @param {boolean} fill 
 * @param {boolean} stroke 
 * @param {FormattingComponent[]} components 
 * @param {number} x
 * @param {number} y  
 * @param {number} maxWidth 
 */
function drawStyled(ctx, breakRule, fill, stroke, components, x, y, maxWidth) {
    const xAlign = ctx.textAlign;
    const yAlign = ctx.textBaseline;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let width = 0;
    let totalHeight = 0;
    let line = [];
    /** @type {{ height: number, components: FormattingComponent[] }[]} */
    const lines = [];
    for (let i = 0; i <= components.length; i++) {
        const tempWidth = width + (components[i]?.width ?? 0);
        if (i >= components.length || tempWidth > maxWidth || (components[i].type === 'text' && components[i].value.includes('\n')) || components[i].breaks) {
            switch (components[i]?.type) {
            case 'text':
                let text = '';
                let lastSpace = -1;
                let lineStart = -1; 
                let firstLine = -1;
                let nextIdx = i;
                const component = components[i];
                components.splice(i, 1);
                for (let j = 0; j < component.value.length; j++) {
                    if (component.value[j] === ' ' || component.value[j] === '\n') lastSpace = j - (lineStart +1);
                    const tempWidth = ctx.measureText(text + component.value[j]).width + width;
                    if (tempWidth > maxWidth || component.value[j] === '\n') {
                        const lineBreak = component.value[j] === '\n';
                        switch (breakRule) {
                        default:
                        case 'preserve-word': {
                            // rule states we must preserve the wod at all cost
                            // if a word isnt broken prior to running off the edge, 
                            // then let it run off the edge
                            if (lastSpace !== -1) {
                                j -= (text.length - (lastSpace +1)) +1;
                                text = text.slice(0, lastSpace);
                            } else if (!lineBreak) {
                                const end = (text.slice(i).match(/[ \n]/)?.index ?? text.length) + j;
                                text += text.slice(i +1, end);
                                j = end -1;
                            }
                            components.splice(nextIdx++, 0, {
                                type: 'text',
                                width: ctx.measureText(text).width,
                                breaks: lineBreak,
                                value: text
                            });
                            break;
                        }
                        case 'break-longest': {
                            // rule states we should break normally unbreakable lines the same 
                            // way break-anywhere would have done
                            if (lastSpace !== -1) {
                                j -= (text.length - (lastSpace +1)) +1;
                                text = text.slice(0, lastSpace);
                            }
                            components.splice(nextIdx++, 0, {
                                type: 'text',
                                width: ctx.measureText(text).width,
                                breaks: lineBreak,
                                value: text
                            });
                            break;
                        }
                        case 'break-anywhere': {
                            // rule states that we break here just because the width has been excede,
                            // nomatter what content we are breaking
                            components.splice(nextIdx++, 0, {
                                type: 'text',
                                width: ctx.measureText(text).width,
                                breaks: lineBreak,
                                value: text
                            });
                            break;
                        }
                        }
                        if (firstLine === -1) firstLine = j;
                        text = '';
                        lastSpace = -1;
                        lineStart = j;
                        if (lineBreak) continue;
                    }
                    text += component.value[j];
                }
                components.splice(nextIdx++, 0, {
                    type: 'text',
                    width: ctx.measureText(text).width,
                    breaks: component.breaks,
                    value: text
                });
                width += components[i].width;
                line.push(components[i]);
                break;
            }
            line.splice(0, 0, makeConfig(ctx));
            const height = getLineHeight(ctx, line);
            lines.push({
                width,
                height,
                components: line
            });
            totalHeight += height;
            width = 0;
            line = [];
            if (i >= components.length) break;
            continue;
        }
        if (components[i].width) width += components[i].width;
        line.push(components[i]);
    }
    switch (yAlign) {
    case 'hanging':
    case 'top': break;
    case 'alphabetic':
    case 'middle': y -= totalHeight / 2; break;
    case 'ideographic':
    case 'bottom': y -= totalHeight; break;
    }
    // dispatch draw for each line
    for (let i = 0; i < lines.length; i++) {
        let cx = x;
        switch (xAlign) {
        case 'left':
        case 'start': break;
        case 'center': cx -= lines[i].width / 2; break;
        case 'end':
        case 'right': cx -= lines[i].width; break;
        }
        drawComponents(ctx, lines[i].components, cx,y, fill, stroke, yAlign, lines[i].height);
        y += lines[i].height;
    }
    ctx.textAlign = xAlign;
    ctx.textBaseline = yAlign;
}
/**
 * @callback GroupStylizer
 * @param {import('./tokenizer').Token[]} tokens
 * @param {FormattingComponent[]} components
 * @returns {{ start: number, end: number, components: FormattingComponent[] }|Promise<{ start: number, end: number, components: FormattingComponent[] }>} The text region to replace with some set of components
 */
/**
 * Converts text to a drawable, styled, form, according to some token rules
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text 
 * @param {{ [key: string]: import('./tokenizer').TokenGenerator }} rules 
 * @param {[string[], GroupStylizer][]} stylizers 
 * @param {FormattingComponent[]} [initialComponents=[]]
 * @returns {FormattingComponent[]}
 */
async function parseText(ctx, text, rules, stylizers, initialComponents = []) {
    const tokenizer = new Tokenizer(text, rules);
    const components = [...initialComponents, makeConfig(ctx), { type: 'text', width: ctx.measureText(text), value: text, index: 0 }];
    for (const [group, handle] of stylizers) {
        const groups = tokenizer.getGroups(group);
        for (const group of groups) {
            const result = await handle(group, components);
            const start = components.findLastIndex(component => component.index <= result.start);
            const end = components.findLastIndex(component => component.index <= result.end);
            const length = (end - start) +1;
            if (length >= 3) {
                if (components[start].type === 'text') {
                    applyConfig(ctx, components.findLast((component, i) => i < start));
                    components[start].value = components[start].value.slice(0, result.start - components[start].index);
                    components[start].width = ctx.measureText(components[start].value).width;
                }
                components.splice(start +1, length -2, ...result.components);
                if (components[end].type === 'text') {
                    applyConfig(ctx, components.findLast((component, i) => i < end));
                    components[end].index = result.end;
                    components[end].value = components[end].value.slice(result.end - components[end].index);
                    components[end].width = ctx.measureText(components[end].value).width;
                }
            }
            if (length == 1 && components[start].type === 'text') {
                const endText = components[end].value.slice(result.end - components[end].index);
                components.splice(start +1, 0, ...result.components);
                applyConfig(ctx, components.findLast((component, i) => i < (end + result.components.length)));
                components.splice(end + result.components.length +1, 0, {
                    type: 'text',
                    width: ctx.measureText(endText).width,
                    value: endText,
                    index: result.end
                });
                applyConfig(ctx, components.findLast((component, i) => i < start));
                components[start].value = components[start].value.slice(0, result.start - components[start].index);
                components[start].width = ctx.measureText(components[start].value).width;
            }
            let offset = 0;
            for (const component of result.components) {
                applyConfig(ctx, components.findLast((component, i) => i < (start + offset +1)));
                if (!('width' in component)) {
                    switch (component.type) {
                    case 'image':
                        const measures = ctx.measureText('abcdefghijklmnopqrstuvwxyz_`|');
                        let lineHeight = measures.actualBoundingBoxAscent + measures.actualBoundingBoxDescent;
                        component.width = lineHeight;
                        break;
                    case 'text': component.width = ctx.measureText(component.value).width; break;
                    }
                }
            }
        }
    }
    return components;
}
Canvas.parseText = parseText;
Canvas.drawStyled = drawStyled;
Canvas.drawComponents = drawComponents;
Canvas.applyConfig = getLineHeight;
Canvas.applyConfig = makeConfig;
Canvas.applyConfig = applyConfig;

/** @type {BreakRule} */
Canvas.CanvasRenderingContext2D.prototype.breakRule = 'preserve-word';
/**
 * Fills text, wrapping when necessary
 * @param {string} text The text to draw
 * @param {number} x the X-axis to start drawing text
 * @param {number} y The Y-axis to start drawing text
 * @param {number} maxWidth The width at which text will be wrapped
 */
Canvas.CanvasRenderingContext2D.prototype.fillTextWrap = function(text, x,y, maxWidth) {
    drawStyled(this, this.breakRule, true, false, [
        {
            type: 'text',
            width: this.measureText(text).width,
            value: text
        }
    ], x, y, maxWidth);
}
/**
 * Strokes text, wrapping when necessary
 * @param {string} text The text to draw
 * @param {number} x the X-axis to start drawing text
 * @param {number} y The Y-axis to start drawing text
 * @param {number} maxWidth The width at which text will be wrapped
 */
Canvas.CanvasRenderingContext2D.prototype.strokeTextWrap = function(text, x,y, maxWidth) {
    drawStyled(this, this.breakRule, false, true, [
        {
            type: 'text',
            width: this.measureText(text).width,
            value: text
        }
    ], x, y, maxWidth);
}

module.exports = Canvas;