const { createCanvas, loadImage } = require('./word-wrap');
const { Asset } = require('./asset-helper');
const { fromApi } = require('./web-requests');

const imageScale = 1;
async function createQuoteCard(message) {
    /** @type {import('canvas').Canvas} */
    const canvas = createCanvas(640 * imageScale, 360 * imageScale);
    /** @type {import('canvas').CanvasRenderingContext2D} */
    const ctx = canvas.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '20px';
    ctx.scale(imageScale);
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0, 640,480);
    const avatar = await loadImage(Asset.UserAvatar(message.author, 'png', 360 * imageScale));
    ctx.drawImage(avatar, 0,0, canvas.height, canvas.height);
    ctx.fillStyle = ctx.createLinearGradient(0,180, 360,180);
    ctx.fillStyle.addColorStop(0, 'transparent');
    ctx.fillStyle.addColorStop(1, 'black');
    ctx.fillRect(0,0, 360,360);
    ctx.fillStyle = 'white';
    ctx.breakRule = 'break-longest';
    ctx.font = '20px sans-serif';
    ctx.fillTextWrap(message.content, 500, 180, 280);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#EEE';
    ctx.fillText(message.author.username, 500, 270, 280);
    return new Blob([canvas.toBuffer()], { type: 'image/png' });
}
async function createQuoteMessage(message, range = 10, direction = 'around') {

}

module.exports = { createQuoteCard, createQuoteMessage }