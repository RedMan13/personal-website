// ==UserScript==
// @name         Scratch Embeder
// @namespace    http://tampermonkey.net/
// @version      2025-09-30
// @description  Makes scratch URLs have playable embeds in discord
// @author       RedMan13
// @match        https://discord.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discord.com
// @run-at       document-start
// ==/UserScript==
// note: not actually react, just using this file type for clearity to both the editor and compiler
// adds scratch embeds for discord allowing sites like penguinmod, turbowarp, and scratch to have playable embeds.
// if you want to have your site added here, make an issue at https://github.com/RedMan13/personal-website/issues with the first part of the title being `sc embed request:`
// alternativly you can try making a pr, i will try to make the comments here well formed so its clear what needs to be done for such
// copied from /cardpage.html, required for the jsx utility
const elementClassNames = {
    "a": 'HTMLAnchorElement',
    "area": 'HTMLAreaElement',
    "audio": 'HTMLAudioElement',
    "base": 'HTMLBaseElement',
    "blockquote": 'HTMLQuoteElement',
    "body": 'HTMLBodyElement',
    "br": 'HTMLBRElement',
    "button": 'HTMLButtonElement',
    "canvas": 'HTMLCanvasElement',
    "caption": 'HTMLTableCaptionElement',
    "col": 'HTMLTableColElement',
    "colgroup": 'HTMLTableColElement',
    "data": 'HTMLDataElement',
    "datalist": 'HTMLDataListElement',
    "del": 'HTMLModElement',
    "details": 'HTMLDetailsElement',
    "dialog": 'HTMLDialogElement',
    "dir": 'HTMLDirectoryElement',
    "div": 'HTMLDivElement',
    "dl": 'HTMLDListElement',
    "embed": 'HTMLEmbedElement',
    "fencedframe": 'HTMLUnknownElement',
    "fieldset": 'HTMLFieldSetElement',
    "font": 'HTMLFontElement',
    "form": 'HTMLFormElement',
    "frame": 'HTMLFrameElement',
    "frameset": 'HTMLFrameSetElement',
    "h1": 'HTMLHeadingElement',
    "head": 'HTMLHeadElement',
    "hr": 'HTMLHRElement',
    "html": 'HTMLHtmlElement',
    "iframe": 'HTMLIFrameElement',
    "img": 'HTMLImageElement',
    "input": 'HTMLInputElement',
    "ins": 'HTMLModElement',
    "label": 'HTMLLabelElement',
    "legend": 'HTMLLegendElement',
    "li": 'HTMLLIElement',
    "link": 'HTMLLinkElement',
    "map": 'HTMLMapElement',
    "marquee": 'HTMLMarqueeElement',
    "menu": 'HTMLMenuElement',
    "meta": 'HTMLMetaElement',
    "meter": 'HTMLMeterElement',
    "object": 'HTMLObjectElement',
    "ol": 'HTMLOListElement',
    "optgroup": 'HTMLOptGroupElement',
    "option": 'HTMLOptionElement',
    "output": 'HTMLOutputElement',
    "p": 'HTMLParagraphElement',
    "param": 'HTMLParamElement',
    "picture": 'HTMLPictureElement',
    "portal": 'HTMLUnknownElement',
    "pre": 'HTMLPreElement',
    "progress": 'HTMLProgressElement',
    "q": 'HTMLQuoteElement',
    "script": 'HTMLScriptElement',
    "select": 'HTMLSelectElement',
    "slot": 'HTMLSlotElement',
    "source": 'HTMLSourceElement',
    "span": 'HTMLSpanElement',
    "style": 'HTMLStyleElement',
    "table": 'HTMLTableElement',
    "tbody": 'HTMLTableSectionElement',
    "td": 'HTMLTableCellElement',
    "template": 'HTMLTemplateElement',
    "textarea": 'HTMLTextAreaElement',
    "tfoot": 'HTMLTableSectionElement',
    "th": 'HTMLTableCellElement',
    "thead": 'HTMLTableSectionElement',
    "time": 'HTMLTimeElement',
    "title": 'HTMLTitleElement',
    "tr": 'HTMLTableRowElement',
    "track": 'HTMLTrackElement',
    "ul": 'HTMLUListElement',
    "video": 'HTMLVideoElement',
    "xmp": 'HTMLPreElement'
};
// loose def for elements that dont require any direct manipulation
function defineElement(name, attributes, innerGen) {
    const extend = attributes.extends;
    /** @type {HTMLElement} */
    const elClass = window[elementClassNames[extend]] ?? HTMLElement;
    let onAttributes;
    class newElement extends elClass {
        static observedAttributes = Object.keys(attributes)
            .filter(key => !key.startsWith('on') && !['extends', 'attributes'].includes(key));
        display = null;
        priv = {};
        constructor() {
            if (extend) 
                return document.createElement(extend, { is: name });
            super();
            if (!this.display) this.display = this.attachShadow({ mode: 'open' });
            innerGen.apply(this, [this.display]);
            for (const [key, val] of Object.entries(attributes)) {
                if (key.startsWith('on')) {
                    this.addEventListener(key.slice(2), val.bind(this));
                    continue;
                }
                this.setAttribute(key, val);
            }
        }
        attributeChangedCallback(key, oldVal, newVal) {
            onAttributes?.apply?.(this, [key, oldVal, newVal]);
            if (key in newElement.prototype) return;
            this[key] = newVal;
        }
    }
    for (const key in attributes) {
        if (key.startsWith('on')) {
            switch (key.slice(3)) {
            case 'connected':
                newElement.prototype.connectedCallback = attributes[key];
                delete attributes[key];
                break;
            case 'disconnected':
                newElement.prototype.disconnectedCallback = attributes[key];
                delete attributes[key];
                break;
            case 'adopted':
                newElement.prototype.adoptedCallback = attributes[key];
                delete attributes[key];
                break;
            case 'attributes':
                onAttributes = attributes[key];
                delete attributes[key];
                break;
            }
            continue;
        }
    }
    if (attributes.attributes) {
        newElement.observedAttributes = attributes.attributes;
        delete attributes.attributes;
    }
    if (attributes.this) {
        Object.assign(newElement.prototype, attributes.this);
        delete attributes.this;
    }
    delete attributes.extends;
    customElements.define(name, newElement, { extends: attributes.extends });
    return newElement;
}
function appendChildren(parent, children) {
    children.forEach(child => {
        if (!child) return;
        if (Array.isArray(child))
            return appendChildren(parent, child);

        try { parent.appendChild(child); }
        catch (e) {
            parent.appendChild(document.createTextNode(String(child)));
        }
    });
}
/** @param {HTMLElement} el */
function setAttribute(el, key, val) {
    if (val) el.setAttribute(key, typeof val === 'object' ? JSON.stringify(val) : val);
    else el.removeAttribute(key);
}
// no script globalization so we need to put it into the window manually
Object.assign(window, { setAttribute, appendChildren, defineElement, elementClassNames });

/**
 * A list of regexes that match and parse urls that need embeding,
 * and functions that generate the embed body and style
 * @type {[RegExp, (...args) => HTMLElement][]}
 */
const sites = [
    // we use turbowarps embed anyways because we can control light/dark and fullscreen on it, unlike the scratch embed
    // scratch doesnt provide embeds to discord, so we have no templating to latch onto
    // [/^https?:\/\/scratch.mit.edu\/projects\/([0-9]+)/, (m, id) => <iframe src={`https://turbowarp.org/${id}/embed`} allowtransparency="true" width="516" frameborder="0" scrolling="no" allowfullscreen></iframe>],
    [/^https?:\/\/turbowarp.org\/([0-9]+).*(?:\?(.+))?/, (m, id, urlArgs = '') => <iframe src={`https://turbowarp.org/${id}/embed?addons=pause,clones&${urlArgs}`} allowtransparency="true" width="400" height="400" frameborder="0" allowfullscreen></iframe>],
    // penguinmod urls are just a tinny bit more complex about this, since theres different repos
    [/^https?:\/\/(?:projects.penguinmod.com\/([0-9]+)|studio.penguinmod.com\/(?:editor.html)?.*(\?.+)?#([0-9]+))/, (m, id1, urlArgs = '', id2) => <iframe src={`https://studio.penguinmod.com/embed.html?addons=pause,clones&${urlArgs}#${id1 ?? id2}`} allowtransparency="true" width="400" height="400" frameborder="0" allowfullscreen></iframe>]
];
// important edits to discords CSP so that embeds work
// when adding a new embed site, add the site source here too
document.head.innerHTML += `<meta http-equiv="Content-Security-Policy" content="frame-src 'https://turbowarp.org' 'https://*.penguinmod.com'">`;
setInterval(() => {
    // discord embeds, particularly the ones from scratch site embeds, are
    // structured as such
    const results = document.querySelectorAll('article div div');
    // foreach is fastest, so we use it on each element
    results.forEach(element => {
        // skip anything that isnt for sure the main embed body
        if (!element.getAttribute('class').includes('grid')) return;
        // remove the hasImage type, that way the embed adds the player correctly
        if (element.getAttribute('class').includes('hasThumbnail'))
            element.setAttribute('class', element.getAttribute('class').replace(/\s*hasThumbnail\S+\s*/, ''));
        // element already has a player, ignore the element
        if (element.getElementsByClassName('scratch-embeder-player')?.length) return;
        // we want the very first href, which should always be the link on the
        // header that takes you to the site
        const linkEl = element.getElementsByTagName('a')[0];
        // no link, ignore the embed
        if (!linkEl) return;
        const link = linkEl.getAttribute('href');
        // foreach can not be broken, so we use for let here instead
        for (let j = 0; j < sites.length; j++) {
            const match = link.match(sites[j][0]);
            // doesnt match
            if (!match) continue;
            // generate the embed executable
            const insert = sites[j][1](...match);
            insert.setAttribute('class', 'scratch-embeder-player');
            // remove the thumbnail image from the embed, may need changed for other sites
            const thumbnail = element.querySelector('a[data-role=img]');
            // we want to remove its highest level, not just the image
            if (thumbnail) thumbnail.parentElement.parentElement.parentElement.remove();
            element.appendChild(insert);
        }
    })
}, 333.333);