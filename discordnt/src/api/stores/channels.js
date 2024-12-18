import { LimitedStore } from "../store.js";
import { Channel, ChannelType } from "../type-enums.js";

export class Channels extends LimitedStore {
    constructor(client) {
        super(client, 0, Infinity, Channel);
        this.listens = [
            'READY', 'CHANNEL_CREATE', 'CHANNEL_UPDATE', 'CHANNEL_DELETE',
            'THREAD_CREATE', 'THREAD_UPDATE', 'THREAD_DELETE', 'THREAD_LIST_SYNC'
        ]
    }
    notify(ev, data) {
        switch (ev) {
        case 'READY':
            for (const guild of data.guilds) {
                for (const channel of guild.channels) {
                    channel.guild_id = guild.id;
                    this.set(channel.id, channel);
                }
                for (const thread of guild.threads) {
                    const channel = { ...thread };
                    channel.guild_id = guild.id;
                    delete channel.member_ids_preview;
                    delete channel.member_ids;
                    this.set(channel.id, channel);
                }
            }
            for (const guild of data.user_guild_settings.entries) {
                for (const settings of guild.channel_overrides) {
                    const id = settings.channel_id
                    delete settings.channel_id;
                    this.set(id, settings);
                }
            }
            break;
        case 'THREAD_CREATE':
        case 'CHANNEL_CREATE':
            delete data.member_ids;
            this.set(data.id, data);
            break;
        case 'THREAD_UPDATE':
        case 'CHANNEL_UPDATE':
            delete data.member_ids;
            this.set(data.id, data);
            break;
        case 'THREAD_DELETE':
        case 'CHANNEL_DELETE':
            delete data.member_ids;
            this.delete(data.id);
            break;
        case 'THREAD_LIST_SYNC':
            for (const channel of data.threads) {
                channelguild_id = data.guild_id;
                this.set(channel.id, channel);
            }
            break;
        }
    }
    forGuild(id) {
        return [...this]
            .map(([id, channel]) => channel)
            .filter(channel => channel.guild_id === id);
    }
    toFolders(guild) {
        const channels = this.forGuild(guild);
        const members = [];
        const tree = {};
        const selected = this.client.askFor('Messages.channel');
        for (const channel of channels) {
            tree[channel.id] = {
                sort: channel.position,
                selected: channel.id === selected || 
                    (channel.type === ChannelType.GUILD_CATEGORY && !channel.collapsed),
                name: channel.name,
                resolve: `#${channel.id}`,
                members: tree[channel.id]?.members
            };
            if (channel.parent_id) {
                tree[channel.parent_id] ??= {};
                tree[channel.parent_id].members ??= [];
                tree[channel.parent_id].members.push(tree[channel.id]);
            } else {
                members.push(tree[channel.id])
            }
        }
        return members;
    }
}