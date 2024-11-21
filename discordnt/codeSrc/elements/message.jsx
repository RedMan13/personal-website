import { format } from '../message-render.js';
import { Asset } from '../asset-helper.js';
import { TimeStamp } from './timestamp.js';

export class DiscordMessage extends HTMLElement {
    static observedAttributes = ['reply', 'short', 'json'];
    #message = {
        author: { id: '0' },
        content: 'Unloaded Message',
        timestamp: new Date().toISOString(),
        channel_id: channel
    }
    /** @type {ShadowRoot|null} */
    #display = null;
    compact = false;
    reply = false;
    constructor(msg) {
        super();
        this.#message = msg;
        this.render();
    }
    async render() {
        if (!this.#display) this.#display = this.attachShadow({ mode: 'open' });
        if (this.compact) {
            this.#display.innerHTML = 
                <div style="padding-left: 2.2rem;">{format(this.#message.content)}</div>;
            return;
        }
        const guildId = client.channels[channel].guild_id;
        const user = await client.getUserDisplay(this.#message.author.id, guildId);
        if (this.reply) {
            this.#display.innerHTML = <div>
                <img 
                    style="
                        display: inline;
                        width: 0.8rem;
                        height: 0.8rem;
                        margin-bottom: -0.2rem;
                        clip-path: circle();
                    "
                    src={Asset.UserAvatar(user, 'png', 20)}
                />
                <span style={`color: ${user.color}`}>{user.name}</span>
                <div>{format(this.#message.content)}</div>
            </div>;
        }
        this.#display.innerHTML = <div 
            style="
                display: grid;
                grid-template-rows: 0.8rem 1rem 1rem;
                grid-template-columns: 2rem 100%;
            "
        >
            {this.#message.message-reference 
                ? <DiscordMessage style="grid-row: 1; grid-column: 2;" /> 
                : null}
            <img 
                style="
                    grid-row: 2 / 4;
                    grid-column: 1 / 2;
                    display: inline;
                    width: 0.8rem;
                    height: 0.8rem;
                    margin-bottom: -0.2rem;
                    clip-path: circle();
                "
                src={Asset.UserAvatar(user, 'png', 20)}
            />
            <div style="grid-row: 2; grid-column: 2;">
                <span style={`color: ${user.color}`}>{user.name}</span>
                <TimeStamp t={this.#message.timestamp} s="M"/>
            </div>
            <div style="grid-row: 3;grid-column: 2;">{format(this.#message.content)}</div>
        </div>;
    }
    attributeChangedCallback(key, oldVal, newVal) {

    }
}
customElements.define('discord-message', DiscordMessage);