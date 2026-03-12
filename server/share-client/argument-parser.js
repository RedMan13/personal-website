const path = require('path');

function clean(str) {
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}
/**
 * Parses the cli arguments
 * @param {{ [key: string]: [string[], { noValue?: boolean, repeatable?: boolean, match?: RegExp, needs?: string[], default?: any }, string] }} keys 
 * @param {string[]} argv 
 * @returns {{ [key: string]: any }}
 */
module.exports = function parseArgs(keys, argv) {
    const props = Object.fromEntries(Object.entries(keys).map(([k,v]) => [k,v[1]]));
    const lookup = { '?': 'help', 'help': 'help' };
    for (const [k,v] of Object.entries(keys)) {
        for (const varient of v[0]) {
            lookup[clean(varient)] = k;
        }
        lookup[k] = k;
    }

    if (path.basename(argv[0]).startsWith('node'))
        argv = argv.slice(2);
    else argv = argv.slice(1);

    const args = Object.entries(keys)
        .reduce((cur, [k,v]) => (cur[k] = v[1].default || (v[1].repeatable && []), cur), {});
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const keys = arg[0] === '-'
            ? arg[1] === '-'
                ? [lookup[arg.slice(2)]]
                : [...arg.slice(1)].map(v => lookup[v])
            : [lookup['default'] ?? 'default'];
        let needsAdvance = false;
        for (const key of keys) {
            const hasValue = !props[key].noValue && ((arg[0] === '-' && (argv[i +1]?.[0] ?? '-') !== '-') || key === 'default' || key === lookup['default']);
            needsAdvance ||= arg[0] === '-' && hasValue;
            if (hasValue && props[key].match && !props[key].match.test(argv[i +1])) throw new TypeError(`Inputs for ${key} must conform to ${props[key].match}`);
            const value = !hasValue ? true : arg[0] !== '-' ? argv[i] : argv[i +1];
            if (props[key].repeatable) args[key].push(value);
            else args[key] = value;
        }
        if (needsAdvance) i++;
    }
    if ('help' in args) {
        let largest; 
        const lines = Object.entries(keys)
            .map(([name, mapping]) => [
                mapping,
                `--${name}, ` + (mapping[0]
                    .map(key => 
                        key === 'default' 
                            ? '\x1b[32m\x1b[1mdefault\x1b[0m' 
                            : key.length > 1 
                                ? `--${key}` 
                                : `-${key}`
                    )
                    .join(', '))
            ])
            .map(([mapping, varients], i, lines) => {
                largest ??= lines.reduce((c,v) => Math.max(c,clean(v[1]).length), 0);
                let line = ' '.repeat((largest - clean(varients).length) +2);
                line += varients;
                line += ' : ';
                if (mapping[1].needs) line += `\x1b[1mRequires: ${mapping[1].needs}.\x1b[0m `;
                line += mapping[2];
                if (mapping[1].default && !mapping[1].noValue) line += ` \x1b[1mDefault: ${mapping[1].default}\x1b[0m`;
                return line;
            });

        console.log('Help document, command format `nxtea \x1b[3m--arguments \x1b[32m\x1b[1mdefault\x1b[0m`');
        console.log('Arguments: ')
        console.log(lines.map(line => line.split(':')[0].padStart(largest, ' ') + ':' + line.split(':').slice(1).join(':')).join('\n'));
        process.exit(0);
    }
    return args;
}