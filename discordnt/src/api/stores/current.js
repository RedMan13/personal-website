import { PreloadedUserSettings } from '../setting-protos/user-settings.proto';
import { Base64Binary } from '../../b64-binnary.js';
import { IndexedMap } from '../indexed-map.js';

export class Current {
    constructor(client) {
        this.client = client;
        this.settings = null;
        this.guilds = new IndexedMap(true);
        this.timeout = false;
        this.changed = [];
        this.user = null;
        this.user_id = null;
        this.listens = ['READY'];
    }
    notify(ev, data) {
        switch (ev) {
        case 'READY':
            this.user = data.user;
            this.user_id = data.user.id;
            const binnary = Base64Binary.decode(data.user_settings_proto);
            this.settings = PreloadedUserSettings.decode(binnary);
            for (const { guild_id, ...guild } of data.user_guild_settings.entries)
                if (guild_id) {
                    guild.channel_overrides ??= [];
                    this.guilds.set(guild_id, guild);
                }
            break;
        }
    }
    getChannelSettings(id) {
        const settings = [...this.guilds].find(([id, settings]) => settings.channel_overrides.find(setting => setting.channel_id === id));
        if (!settings?.channel_overrides) return;
        return settings.channel_overrides.find(setting => setting.channel_id === id);
    }
    getGuildSettings(id) {
        return this.guilds.get(id);
    }
    setGuildSettings(settings) {
        if (!settings.id) {
            for (const channel of settings.channel_overrides) {
                const real = this.client.askFor('Channels.get', channel.id);
                this.setGuildSettings({
                    id: real.guild_id,
                    channel_overrides: [channel]
                });
            }
            return;
        }

        const id = settings.id;
        const channels = settings.channel_overrides;
        delete settings.channel_overrides;
        this.guilds.set(id, settings);
        const current = this.guilds.get(settings);
        for (const channel of current.channel_overrides) {
            const assign = channels.find(c => c.id === channel.id);
            if (!assign) continue;
            Object.assign(channel, assign);
        }

        if (!this.timeout) {
            this.timeout = true;
            this.changed.push(id);
            setTimeout(() => {
                const changes = Object.fromEntries(this.changed
                    .map(id => [id, this.guilds.get(id)]));
                this.client.fromApi('/users/@me/guilds/settings', changes);
                this.changed = [];
            }, 1000);
        } else this.changed.push(id);
    }
    getGuildSort(id) {
        const sort = this.settings.guildFolders.guildPositions.findIndex(guild => guild == id);
        return sort < 0 ? null : sort;
    }
    myServers() {
        const added = [];
        const folders = [];
        const guilds = this.client.store('Guilds');
        for (const folder of this.settings.guildFolders.folders) {
            added.push(...folder.guildIds.map(String));
            const servers = folder.guildIds
                .map(guild => guilds.get(guild));
            const id = String(folder.id?.value ?? servers[0].id);
            added.push(id);
            const name = folder.name?.value ??
                servers.length <= 1 
                    ? servers[0].name 
                    : servers
                        .slice(0, -1)
                        .map(folder => folder.name)
                        .join(', ') + 
                        ' and ' + servers[0].name
            folders.push({
                id,
                name,
                color: folder.color?.value || 0x5865F2,
                sort: this.getGuildSort(id),
                servers
            });
        }
        for (const [id, guild] of guilds) {
            if (!added.includes(id)) {
                folders.push({
                    id,
                    name: guild.name,
                    sort: this.getGuildSort(id),
                    color: 0x5865F2,
                    servers: [guild]
                });
            }
        }
        return folders.sort((a,b) => a.sort - b.sort);
    }
}