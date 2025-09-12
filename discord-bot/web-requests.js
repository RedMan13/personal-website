const apiReqs = {};
const limitedApis = {};
let globalLimit = NaN;
function fromApi(callPath, body) {
    if (apiReqs[callPath]) return apiReqs[callPath];
    const [method, path] = callPath.split(' ', 2);
    if (Date.now() < limitedApis[path]) return;
    if (Date.now() < globalLimit) return;
    delete limitedApis[path];
    globalLimit = NaN;
    const url = new URL(`https://discord.com/api/v10${path}`);
    console.log(method, 'at', url.toString());
    const opts = {
        method,
        headers: {
            'Authorization': `Bot ${process.env.botToken}`,
            'Content-Type': 'application/json',
            'User-Agent': `DiscordBot (https://godslayerakp.serv00.net/discord-bot, v1)`
        }
    }
    if (method === 'GET' && body) {
        for (const [key, value] of Object.entries(body)) {
            if (!value) continue;
            url.searchParams.set(key, value);
        }
    } else {
        opts.body = JSON.stringify(body);
    }

    const promise = fetch(url, opts)
        .then(async req => [await req.json(), req.status === 429])
        .catch(message => [{ message, code: 0 }, false])
        .then(([res, isRatelimit]) => {
            delete apiReqs[url];
            if (res.code === 40062 || isRatelimit) {
                const stamp = Date.now() + (res.retry_after * 1000);
                if (res.global) globalLimit = stamp;
                else limitedApis[path] = stamp;
            }
            if ('code' in res) {
                console.log('Discord API response error:', res);
                return Promise.reject(res);
            }
            return res;
        });
    apiReqs[url] = promise;
    return promise;
}

module.exports = { fromApi };