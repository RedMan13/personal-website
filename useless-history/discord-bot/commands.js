const { fromApi } = require('./web-requests');
const { ApplicationCommandType, ApplicationIntegrationType, ApplicationCommandOptionType, InteractionContextType } = require('./enums');

const commands = fromApi(`PUT /applications/${process.env.botId}/commands`, [
    {   
        type: ApplicationCommandType.CHAT_INPUT,
        name: 'ping',
        description: 'Pings the bot/server, returns some status info like time to respond and processes used',
        integration_types: [ApplicationIntegrationType.GUILD_INSTALL, ApplicationIntegrationType.USER_INSTALL],
        contexts: [InteractionContextType.BOT_DM, InteractionContextType.GUILD, InteractionContextType.PRIVATE_CHANNEL]
    },
    {   
        type: ApplicationCommandType.CHAT_INPUT,
        name: 'search',
        description: 'Searches for an arbitrary page on the website.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                optional: true,
                name: 'file',
                description: 'The keywords to search for on the site, if not provided then the entire site index is reported.'
            }
        ],
        integration_types: [ApplicationIntegrationType.GUILD_INSTALL, ApplicationIntegrationType.USER_INSTALL],
        contexts: [InteractionContextType.BOT_DM, InteractionContextType.GUILD, InteractionContextType.PRIVATE_CHANNEL]
    },
    {
        type: ApplicationCommandType.MESSAGE,
        name: 'Quote',
        integration_types: [ApplicationIntegrationType.GUILD_INSTALL, ApplicationIntegrationType.USER_INSTALL],
        contexts: [InteractionContextType.BOT_DM, InteractionContextType.GUILD, InteractionContextType.PRIVATE_CHANNEL]
    }
]).catch(() => []);

module.exports = { commands }