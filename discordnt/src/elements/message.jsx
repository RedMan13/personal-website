import { format } from './message-render.js';
import { Asset } from '../api/asset-helper.js';
import { TimeStamp } from './timestamp.js';

export class DiscordMessage extends HTMLElement {
    static observedAttributes = ['reply', 'short', 'id'];
    #message = null
    /** @type {ShadowRoot|null} */
    #display = null;
    reply = false;
    constructor() { super(); }
    async render(member) {
        if (!this.#display) this.#display = this.attachShadow({ mode: 'open' });

        const message = client.askFor('Messages.get', this.#message);
        const compact = client.askFor('isChildMessage', this.#message);
        const guildId = client.askFor('guild');
        if (compact) {
            this.#display.innerHTML = (
                <div style="padding-left: calc(2rem + 8px)">
                    {await format(message.content)}
                </div>
            ).outerHTML;
            return;
        }

        // this should almost NEVER fetch as the messages store auto-populates the user store
        // with the authors of the messages stored
        // incase it does we realistcally cant do anything but wait until the user is resolved
        member ??= (client.askFor('Members.has', guildId + message.author_id) &&
            await client.askFor('getMember', guildId, message.author_id));
        const user = member ?? await client.askFor('getUser', message.author_id);
        if (this.reply) {
            this.#display.innerHTML = (<div
                style="
                    display: grid;
                    grid-template-columns: 0.8rem auto minmax(auto, 1fr);
                "
            >
                <img 
                    style="
                        display: inline-block;
                        width: 0.8rem;
                        height: 0.8rem;
                        clip-path: circle();
                    "
                    src={Asset.UserAvatar(user, 'png', 16)}
                />
                <span style={`
                    color: ${user.top_role?.color ?? 'black'}; 
                    font-size: 0.8rem;
                    padding: 0 4px;
                `}>{user.username}</span>
                <span style="font-size: 0.8rem">{await format(message.content)}</span>
            </div>).outerHTML;
            return;
        }
        this.#display.innerHTML = (<div 
            style="
                display: grid;
                grid-template-rows: auto 1rem auto;
                grid-template-columns: 2rem 4px auto;
                padding: 2px 4px;
            "
        >
            {message.message_reference && message.message_reference.type === 0
                ? [
                    <div style="
                        grid-row: 1; grid-column: 1;
                        margin-left: 1rem;
                        margin-top: 0.4rem;
                        border: 1px solid black;
                        border-bottom-width: 0px;
                        border-right-width: 0px;
                        border-top-left-radius: 0.4rem;
                        height: 0.4rem;
                        width: 1rem;
                    "></div>,
                    <DiscordMessage 
                        style="grid-row: 1; grid-column: 3;" 
                        id={message.message_reference.message_id} 
                        reply={true}
                    />
                ] 
                : null}
            <img 
                style="
                    grid-row: 2 / 4;
                    grid-column: 1 / 2;
                    display: inline;
                    width: 2rem;
                    height: 2rem;
                    margin-bottom: -0.2rem;
                    clip-path: circle();
                "
                src={Asset.UserAvatar(user, 'png', 256)}
            />
            <div style="grid-row: 2; grid-column: 3;">
                <span style={`color: ${user.top_role?.color ?? 'black'}`}>{user.username}</span>
                {user.top_role?.irole?.icon ? <img 
                    style="
                        margin-left: .25rem;
                        vertical-align: top;
                        position: relative;
                        top: 1px;
                        width: 1rem;
                        height: 1rem;
                    "
                    src={Asset.RoleIcon(user.top_role.irole, 'webp', 32)}
                /> : null}
                {user.top_role?.emoji ? <span
                    style="
                        width: 1rem;
                        height: 1rem;
                    "
                >{user.top_role?.emoji}</span> : null}
                <TimeStamp style="padding-left: 1rem; font-size: 0.7rem" t={message.timestamp} s="M"/>
            </div>
            <div style="grid-row: 3; grid-column: 3;">{await format(message.content)}</div>
        </div>).outerHTML;

        if (guildId && !client.askFor('Members.has', guildId + message.author_id)) 
            client.askFor('getMember', guildId, message.author_id)
                .then(member => member && this.render(member));
    }
    async attributeChangedCallback(key, oldVal, newVal) {
        switch (key) {
        // in the case of message id, attempt to setup the message content as soon as possible
        case 'id': this.#message = newVal; break;
        case 'reply': this.reply = newVal !== 'false'; break;
        }

        const message = client.askFor('Messages.get', this.#message);
        if (!message) return; // message doesnt exist, refuse to process until it does
        await this.render();
    }
}
customElements.define('discord-message', DiscordMessage);