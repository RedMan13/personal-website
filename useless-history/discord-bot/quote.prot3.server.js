const { createQuoteCard, createQuoteMessage } = require('./quote-generator');

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {(code: number, message: string, res: import('express').Response, retry: boolean) => void} reject 
 * @param {{ [key: string]: number }} codes 
 */
module.exports = async function(req, res, reject, codes) {
    try {
        let promise;
        if ('card' in req.query)
            promise = createQuoteCard(JSON.parse(req.query.content));
        if ('message' in req.query)
            promise = createQuoteMessage(JSON.parse(req.query.content));
        const blob = await promise
            .catch(err => reject(codes.InternalServerError, err?.message ?? err, res, console.log(err)));
        if (!blob) return;
        res.header('Content-Type', 'image/png');
        res.send(Buffer.from(await blob.bytes()));
        return;    
    } catch (err) {
        reject(codes.InternalServerError, err?.message ?? err, res);
        console.log(err)
    }
}