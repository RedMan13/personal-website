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
    if ('textBaseline' in config) ctx.textBaseline = config.textBaseline;
    if ('textAlign' in config) ctx.textAlign = config.textAlign;
    if ('direction' in config) ctx.direction = config.direction;
    if ('lang' in config) ctx.lang = config.lang;
}
/**
 * Draws a list of components at a specific location
 * @param {CanvasRenderingContext2D} ctx 
 * @param {FormattingComponent[]} components 
 * @param {number} x 
 * @param {number} y 
 * @param {boolean} fill 
 * @param {boolean} stroke 
 */
function drawComponents(ctx, components, x,y, fill, stroke, lineHeight) {
    for (let i = 0; i < components.length; i++) {
        switch (components[i].type) {
        case 'image':
            ctx.drawImage(components[i].value, x,y, (lineHeight / components[i].width) * components[i].width, lineHeight);
            x += components[i].width;
            break;
        case 'text':
            if (fill) ctx.fillText(components[i].value, x,y);
            if (stroke) ctx.strokeText(components[i].value, x,y);
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
    const measures = ctx.measureText('abcdefghijklmnopqrstuvwxyz_`|');
    const lineHeight = measures.actualBoundingBoxAscent + measures.actualBoundingBoxDescent;
    let width = 0;
    let line = [];
    for (let i = 0; i < components.length; i++) {
        const tempWidth = width + components[i].width;
        if (tempWidth > maxWidth || (components[i].type === 'text' && components[i].value.includes('\n'))) {
            switch (components[i].type) {
            case 'text':
                let text = '';
                let lastSpace = -1;
                let lineStart = 0;
                let firstLine = -1;
                let nextIdx = i;
                const component = components[i];
                components.splice(i, 1);
                for (let i = 0; i < component.value.length; i++) {
                    if (component.value[i] === ' ') lastSpace = i - lineStart;
                    const tempWidth = ctx.measureText(text).width + width;
                    if (tempWidth > maxWidth || component.value[i] === '\n') {
                        if (firstLine === -1) firstLine = i;
                        switch (breakRule) {
                        default:
                        case 'preserve-word': {
                            // rule states we must preserve the wod at all cost
                            // if a word isnt broken prior to running off the edge, 
                            // then let it run off the edge
                            if (lastSpace !== -1) {
                                i -= (text.length - (lastSpace +1)) +1;
                                text = text.slice(0, lastSpace);
                            } else if (text[i] !== '\n') {
                                const end = (text.slice(i).match(/[ \n]/)?.index ?? text.length) + i;
                                text += text.slice(i +1, end);
                                i = end -1;
                            }
                            components.splice(i + nextIdx++, 0, {
                                type: 'text',
                                width: ctx.measureText(text).width,
                                value: text
                            });
                            text = '';
                            lastSpace = -1;
                            lineStart = i;
                            break;
                        }
                        case 'break-longest': {
                            // rule states we should break normally unbreakable lines the same 
                            // way break-anywhere would have done
                            if (lastSpace !== -1) {
                                i -= (text.length - (lastSpace +1)) +1;
                                text = text.slice(0, lastSpace);
                            }
                            components.splice(i + nextIdx++, 0, {
                                type: 'text',
                                width: ctx.measureText(text).width,
                                value: text
                            });
                            text = '';
                            lastSpace = -1;
                            lineStart = i;
                            break;
                        }
                        case 'break-anywhere': {
                            // rule states that we break here just because the width has been excede,
                            // nomatter what content we are breaking
                            components.splice(i + nextIdx++, 0, {
                                type: 'text',
                                width: ctx.measureText(text).width,
                                value: text
                            });
                            text = '';
                            break;
                        }
                        }
                    }
                    text += component.value[i];
                }
                line.push({
                    type: 'text',
                    width: ctx.measureText(component.value.slice(firstLine)),
                    value: component.value.slice(firstLine)
                });
                drawComponents(ctx, line, x,y, fill, stroke, lineHeight);
                width = 0;
                line = [];
                y += lineHeight;
                break;
            case 'image':
                drawComponents(ctx, line, x,y, fill, stroke, lineHeight);
                width = 0;
                line = [];
                y += lineHeight;
            }
        }
        line.push(components[i]);
    }
    drawComponents(ctx, line, x,y, fill, stroke, lineHeight);
}
/**
 * Converts text to a drawable, styled, form, according to some token rules
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text 
 * @param {{ [key: string]: import('./tokenizer').TokenGenerator }} rules 
 * @param {[string[], (tokens: import('./tokenizer').Token[]) => FormattingComponent][]} stylizers 
 * @returns {FormattingComponent[]}
 */
function parseText(ctx, text, rules, stylizers, initialComponents = []) {
    const tokenizer = new Tokenizer(text, rules);
    const components = [...initialComponents];
    for (const [group, handle] of stylizers) {
        const tokens = tokenizer.getGroups(group);
        const component = handle(tokens);
        switch (component.type) {
        case 'text': component.width = ctx.measureText(component.value).width; break;
        case 'image': component.width = component.value.width; break;
        case 'config': applyConfig(ctx, component.value); break;
        }
        components.push(component);
    }
    return components;
}
Canvas.parseText = parseText;
Canvas.drawStyled = drawStyled;
Canvas.drawComponents = drawComponents;
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