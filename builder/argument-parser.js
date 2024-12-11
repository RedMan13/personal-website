const path = require('path');

module.exports = function parseArgs(keys, argv) {
    const lookup = {};
    for (const [k,v] of Object.entries(keys)) {
        for (const varient of v[0]) {
            lookup[varient] = k;
        }
        lookup[k] = k;
    }

    if (path.basename(argv[0]) === 'node')
        argv = argv.slice(2);
    else argv = argv.slice(1);

    const args = Object.entries(keys)
        .reduce((cur, [k,v]) => (cur[k] = v[1], cur), {});
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const key = arg[0] === '-'
            ? arg[1] === '-'
                ? lookup[arg.slice(2)]
                : lookup[arg.slice(1)]
            : lookup['default'] ?? 'default';
        if (arg[0] === '-') i++;
        args[key] = argv[i];
    }
    return args;
}