import { LimitedStore } from "../store.js";
import { Member } from "../type-enums.js";
import { GatewayOpcode } from "../type-enums.js";

export class Members extends LimitedStore {
    constructor(client) {
        super(client, 0, 600, Member);
        this.listens = [
            'READY', 'READY_SUPPLEMENTAL',
            'GUILD_MEMBERS_CHUNK', 'GUILD_MEMBER_UPDATE', 'GUILD_MEMBER_REMOVE'
        ];
        this.requests = {};
        this.nonce = 0;
        this.inTimeout = false;
        this.on('set', (key, old, val) => {
            if (val && val.user) {
                this.client.askFor('Users.set', val.user.id, val.user);
                val.user_id = val.user.id;
                delete val.user;
            }
        })
    }
    notify(ev, data) {
        switch (ev) {
        case 'READY':
        case 'READY_SUPPLEMENTAL':
            for (const [idx, guild] of Object.entries(data.merged_members)) {
                const guildId = data.guilds[idx].id;
                for (const member of guild) {
                    this.set(guildId + member.user_id, member);
                }
            }
            break;
        case 'GUILD_MEMBERS_CHUNK':
            for (const member of data.members)
                this.set(data.guild_id + member.user.id, member);
            if (data.chunk_index >= data.chunk_count -1) {
                const resolves = this.requests[data.nonce][1];
                if (Array.isArray(resolves)) {
                    for (const resolve of resolves)
                        resolve();
                } else resolves();
                delete this.requests[data.nonce];
            }
            break;
        case 'GUILD_MEMBER_UPDATE':
            if (!this.has(data.guild_id + data.user.id)) break;
            this.set(data.guild_id + data.user.id, data);
            break;
        case 'GUILD_MEMBER_REMOVE':
            this.remove(data.guild_id + data.user.id);
            break;
        }
    }
    
    async getMember(guild, userId) {
        if (!guild) return this.client.askFor('getUser', userId);
        const id = guild + userId;
        if (!this.has(id)) {
            let resolveFunc;
            const promise = new Promise(resolve => resolveFunc = resolve);
            const nonce = `${this.nonce++}`;
            this.requests[nonce] = [userId, resolveFunc];
            if (!this.inTimeout) {
                this.inTimeout = true;
                // set timeout to collect all of a moment instead of one of this call
                setTimeout(() => {
                    this.inTimeout = false;
                    const users = Object.entries(this.requests)
                        .filter(([id]) => +id >= +nonce)
                        .map(([nonce, resolve]) => resolve);
                    this.requests[nonce][1] = users
                        .map(([id, resolve]) => resolve)
                    this.client.send(GatewayOpcode.RequestGuildMembers, {
                        guild_id: guild,
                        user_ids: users
                            .map(([id]) => id)
                            .reduce((c,v) => (c.includes(v) || c.push(v), c), []),
                        nonce: nonce
                    });
                }, 1);
            }
            await promise;
        }
        const user = await this.client.askFor('getUser', userId);
        const member = this.get(id);
        if (!member) return user;
        const topRole = this.client.askFor('totalRole', member.roles);
        return {
            ...user,
            ...member,
            top_role: topRole,
            username: member.nick ?? user.username,
            avatar: member.avatar ?? user.avatar,
            banner: member.banner ?? user.banner,
            avatar_decoration_data: member.avatar_decoration_data ?? user.avatar_decoration_data
        }
    }
}