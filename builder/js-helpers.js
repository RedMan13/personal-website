module.exports.jumpArbit = 
/**
 * Matches all js structures that have arbitrary and irrelavent contents
 * @param {string} str The string to check (only checks from start)
 * @returns {number} the length of the match
 */
function jumpArbit(str) {
    const match = str.match(/^('(\\'|[^'\n])*'|"(\\"|[^"\n])*"|`(\\`|\\\$|[^`$])*`|\/\/[^\n]*|\/\*(\*.|[^*])*?\*\/|\/([^\/\n]|\\\/)*\/[a-z]*)/is);
    if (match) return match[0].length;
    if (str[0] !== '`') return 0;
    let indent = 0;
    let inJs = false;
    for (let i = 1; i < str.length; i++) {
        if (inJs) {
            const jmp = jumpArbit(str.slice(i));
            if (jmp) {
                i += jmp -1;
                continue;
            }
        }
        if (str[i -1] === '\\') continue;
        if (!inJs && str[i] === '`') return i +1;
        if (str[i] === '$') inJs = true;
        if (str[i] === '{') indent++;
        if (str[i] === '}') {
            indent--;
            if (inJs && indent === 0) inJs = false;
        }
    }
    return 0;
}