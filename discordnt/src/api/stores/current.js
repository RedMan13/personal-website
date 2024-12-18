// for some fucking reason, this is
import { util, configure } from 'protobufjs/minimal';
import Long from 'long';
util.Long = Long;
configure();
import { PreloadedUserSettings } from '../setting-protos/user-settings.proto';
import { Base64Binary } from '../../b64-binnary.js';

export class Current {
    constructor(client) {
        this.client = client;
        this.settings = null;
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
            break;
        }
    }
    getGuildSort(id) {
        const sort = this.settings.guildFolders.guildPositions.findIndex(guild => guild.toString() == id);
        return sort < 0 ? null : sort;
    }
    myServers() {
        const added = [];
        const folders = [];
        const guilds = this.client.store('Guilds');
        for (const folder of this.settings.guildFolders.folders) {
            added.push(...folder.guildIds.map(String));
            const servers = folder.guildIds
                .map((guild, idx) => {
                    const folder = guilds.toFolder(guild);
                    folder.sort = idx;
                    return folder;
                });
            if (folder.guildIds.length === 1) {
                servers[0].sort = this.getGuildSort(folder.guildIds[0]);
                folders.push(servers[0]);
                continue;
            }
            added.push(String(folder.id.value));
            const name = folder.name?.value ??
                servers
                    .slice(0, -1)
                    .map(folder => folder.name)
                    .join(', ') + 
                    ' and ' + servers[0].name
            folders.push({
                name,
                sort: this.getGuildSort(folder.id.value),
                members: servers
            });
        }
        for (const [guild] of guilds) {
            if (!added.includes(guild)) {
                const folder = guilds.toFolder(guild);
                folder.sort = sorts[guild];
                folders.push(folder);
            }
        }
        return {
            name: 'DiscordNT',
            members: folders
        }
    }
}