const Canvas = require('canvas');

/** @type {'preserve-word'|'break-longest'|'break-anywhere'} */
Canvas.CanvasRenderingContext2D.prototype.breakRule = 'preserve-word';
/**
 * Fills text, wrapping when necessary
 * @param {string} text The text to draw
 * @param {number} x the X-axis to start drawing text
 * @param {number} y The Y-axis to start drawing text
 * @param {number} maxWidth The width at which text will be wrapped
 */
Canvas.CanvasRenderingContext2D.prototype.fillTextWrap = function(text, x,y, maxWidth) {
    const measures = this.measureText('abcdefghijklmnopqrstuvwxyz_`|');
    const lineHeight = measures.actualBoundingBoxAscent + measures.actualBoundingBoxDescent;
    let line = '';
    let lineStart = 0;
    let lastSpace = -1;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') lastSpace = i - lineStart;
        const measures = this.measureText(line + text[i]);
        if (measures.width > maxWidth || text[i] === '\n') {
            switch (this.breakRule) {
            default:
            case 'preserve-word':
                // rule states we must preserve the wod at all cost
                // if a word isnt broken prior to running off the edge, 
                // then let it run off the edge
                if (lastSpace !== -1) {
                    i -= (line.length - (lastSpace +1)) +1;
                    line = line.slice(0, lastSpace);
                } else if (text[i] !== '\n') {
                    const end = (text.slice(i).match(/[ \n]/)?.index ?? text.length) + i;
                    line += text.slice(i +1, end);
                    i = end -1;
                }
                this.fillText(i + ':' + text.length + ':' + lineHeight + ':' + line.trim(), x,y);
                y += lineHeight;
                line = '';
                lastSpace = -1;
                lineStart = i;
                break;
            case 'break-longest':
                // rule states we should break normally unbreakable lines the same 
                // way break-anywhere would have done
                if (lastSpace !== -1) {
                    i -= (line.length - (lastSpace +1)) +1;
                    line = line.slice(0, lastSpace);
                }
                this.fillText(line.trim(), x,y);
                y += lineHeight;
                line = '';
                lastSpace = -1;
                lineStart = i;
                break;
            case 'break-anywhere':
                // rule states that we break here just because the width has been excede,
                // nomatter what content we are breaking
                this.fillText(line.trim(), x,y);
                y += lineHeight;
                line = '';
                lastSpace = -1;
                lineStart = i;
                break;
            }
        }
        line += text[i];
    }
}
/**
 * Strokes text, wrapping when necessary
 * @param {string} text The text to draw
 * @param {number} x the X-axis to start drawing text
 * @param {number} y The Y-axis to start drawing text
 * @param {number} maxWidth The width at which text will be wrapped
 */
Canvas.CanvasRenderingContext2D.prototype.strokeTextWrap = function(text, x,y, maxWidth) {
    const measures = this.measureText('abcdefghijklmnopqrstuvwxyz_`|');
    const lineHeight = measures.actualBoundingBoxAscent + measures.actualBoundingBoxDescent;
    let line = '';
    let lastSpace = -1;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') lastSpace = i;
        const measures = this.measureText(line + text[i]);
        if (measures.width > maxWidth || text[i] === '\n') {
            switch (this.breakRule) {
            default:
            case 'preserve-word':
                // rule states we must preserve the wod at all cost
                // if a word isnt broken prior to running off the edge, 
                // then let it run off the edge
                if (lastSpace !== -1) {
                    i -= (line.length - (lastSpace +1)) +1;
                    line = line.slice(0, lastSpace);
                } else {
                    const end = text.includes(' ', i) ? text.indexOf(' ', i) : text.length;
                    line += text.slice(i +1, end);
                    i = end -1;
                }
                this.strokeText(line.trim(), x,y);
                y += lineHeight;
                line = '';
                lastSpace = -1;
                break;
            case 'break-longest':
                // rule states we should break normally unbreakable lines the same 
                // way break-anywhere would have done
                if (lastSpace !== -1) {
                    i -= (line.length - (lastSpace +1)) +1;
                    line = line.slice(0, lastSpace);
                }
                this.strokeText(line.trim(), x,y);
                y += lineHeight;
                line = '';
                lastSpace = -1;
                break;
            case 'break-anywhere':
                // rule states that we break here just because the width has been excede,
                // nomatter what content we are breaking
                this.strokeText(line.trim(), x,y);
                y += lineHeight;
                line = '';
                lastSpace = -1;
                break;
            }
        }
        line += text[i];
    }
}

module.exports = Canvas;