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
        type: ApplicationCommandType.MESSAGE,
        name: 'Quote (Card)',
        integration_types: [ApplicationIntegrationType.GUILD_INSTALL, ApplicationIntegrationType.USER_INSTALL],
        contexts: [InteractionContextType.BOT_DM, InteractionContextType.GUILD, InteractionContextType.PRIVATE_CHANNEL]
    },
    {
        type: ApplicationCommandType.MESSAGE,
        name: 'Quote (Message)',
        integration_types: [ApplicationIntegrationType.GUILD_INSTALL, ApplicationIntegrationType.USER_INSTALL],
        contexts: [InteractionContextType.BOT_DM, InteractionContextType.GUILD, InteractionContextType.PRIVATE_CHANNEL]
    },
    {
        type: ApplicationCommandType.MESSAGE,
        name: 'Quote (Multiple Messages)',
        integration_types: [ApplicationIntegrationType.GUILD_INSTALL, ApplicationIntegrationType.USER_INSTALL],
        contexts: [InteractionContextType.BOT_DM, InteractionContextType.GUILD, InteractionContextType.PRIVATE_CHANNEL]
    }
]).catch(() => []);

module.exports = { commands }