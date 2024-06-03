const nameStartChars = '_a-z';
const nameChars = `${nameStartChars}\\-\\.`;
const javascript = '\\{.*?\\}';
const string = '"((\\.|[^"])*?)"|\'((\\.|[^\'])*?)\'';
const nameJs = `[${nameStartChars}][${nameChars}]*|${javascript}`;
const nsName = `((?<{o}Namespace>${nameJs}):)?(?<{o}Name>${nameJs})`;
const e4xVariable = '*|[$_a-z][0-9a-z$]*'
const nsVariable = `((?<{o}Namespace>${e4xVariable})::)?(?<{o}KeyName>${e4xVariable})`
const evalNsVariable = `((?<{o}EvalNamespace>\\[.+?\\])::)?(?<{o}EvalKeyName>\\[.+?\\])`

module.exports = {
    tokens: {
        comment: '<!--.*?-->',

        listWrapperOpen: '<>',
        listWrapperClose: '</>',

        xmlOpen: `<!?\\??${nsName}`,
        xmlAttr: `\s+${nsName}(=(?<hasValue>${string}|${javascript}))?`,
        xmlTopClose: '\\??>',
        xmlClose: `/>|</${nsName}>`,
        xmlStringSpace: '[^<]+',
        
        attribute: `\\.?@(${nsVariable}|${evalNsVariable})`,
        variable: '(;|\n\s*)[$_a-z][0-9a-z$]*',
        genericRead: `\\.${nsVariable}|${evalNsVariable}`,
        descendentRead: `\\.\\.(${nsVariable}|${evalNsVariable})`,
        filterAccess: '\\.\\(.+?\\)'
    },
    patterns: {
        xmlList: ['listWrapperOpen', '*{xmlDecleration}', 'listWrapperClose'],
        xmlDecleration: ['xmlOpen', '*xmlAttr', 'xmlTopClose', ['*{xmlDecleration}', 'xmlStringSpace'], 'xmlClose']
    }
};
