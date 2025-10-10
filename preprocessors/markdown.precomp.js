const marked = require('marked');
const footnotes = require('marked-footnote');
const { gfmHeadingId } = require('marked-gfm-heading-id');
const markedSequentialHooks = require('marked-sequential-hooks');
const markedHookFrontmatter = require('marked-hook-frontmatter');
const implementTemplate = require('./html-templating.precomp');
marked.use(markedSequentialHooks({
    markdownHooks: [markedHookFrontmatter()],
    htmlHooks: [(html, { title, template, ...metaArgs }) => `
        <!TEMPLATE ${template ?? '/cardpage.html'}>
        <head>
            <title>${title}</title>
            ${Object.entries(metaArgs).map(([name, value]) => `<meta name="${name}" value="${value}">`)}
            <style>
                blockquote {
                    border-left: 3px solid rgba(0, 0, 0, 0.44);
                    border-radius: 3px;
                    background-color: rgba(0, 0, 0, 0.20);
                    margin: 0;
                    padding-left: 5px;
                }
                code {
                    border: 1px solid rgba(0, 0, 0, 0.20);
                    border-radius: 2px;
                    background-color: rgba(0, 0, 0, 0.20);
                    font-family: monospace;
                }
            </style>
        </head>
        <body>${html}</body>
    `]
}));
marked.use({
    gfm: true,
    breaks: true,
    silent: true
}, footnotes(), gfmHeadingId());

module.exports = function(util) {
    const res = marked.parse(util.file);
    util.file = String(res);
    util.path = util.path.slice(0, -2) + 'html';
    return implementTemplate(util);
}
module.exports.matchFile = util => util.matchType('.md');
module.exports.weight = -1;