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
        name: 'quote',
        description: 'Quotes a message',
        options: [
            {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'card',
                description: 'A card-shaped quote image, mutch like Quote Bot',
                options: [,
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'message-link',
                        description: 'The link to the message to quote',
                        required: true,
                    },
                    {
                        type: ApplicationCommandOptionType.BOOLEAN,
                        name: 'hidden',
                        description: 'If the result should be hidden of not',
                        required: false
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'message',
                description: 'Effectively, a screenshot of a discord message or range of messages',
                options: [,
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'message-link',
                        description: 'The link to the message to quote',
                        required: true,
                    },
                    {
                        type: ApplicationCommandOptionType.INTEGER,
                        name: 'message-count',
                        description: 'How many messages around the selected message should be included',
                        required: false
                    },
                    {
                        type: ApplicationCommandOptionType.BOOLEAN,
                        name: 'hidden',
                        description: 'If the result should be hidden of not',
                        required: false
                    }
                ]
            }
        ],
        integration_types: [ApplicationIntegrationType.GUILD_INSTALL, ApplicationIntegrationType.USER_INSTALL],
        contexts: [InteractionContextType.BOT_DM, InteractionContextType.GUILD, InteractionContextType.PRIVATE_CHANNEL]
    },
    {
        type: ApplicationCommandType.MESSAGE,
        name: 'quote',
        description: 'Quotes a message',
        options: [
            {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'card',
                description: 'A card-shaped quote image, mutch like Quote Bot',
                options: [,
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'message-link',
                        description: 'The link to the message to quote',
                        required: true,
                    },
                    {
                        type: ApplicationCommandOptionType.BOOLEAN,
                        name: 'hidden',
                        description: 'If the result should be hidden of not',
                        required: false
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'message',
                description: 'Effectively, a screenshot of a discord message or range of messages',
                options: [,
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'message-link',
                        description: 'The link to the message to quote',
                        required: true,
                    },
                    {
                        type: ApplicationCommandOptionType.INTEGER,
                        name: 'message-count',
                        description: 'How many messages around the selected message should be included',
                        required: false
                    },
                    {
                        type: ApplicationCommandOptionType.BOOLEAN,
                        name: 'hidden',
                        description: 'If the result should be hidden of not',
                        required: false
                    }
                ]
            }
        ],
        integration_types: [ApplicationIntegrationType.GUILD_INSTALL, ApplicationIntegrationType.USER_INSTALL],
        contexts: [InteractionContextType.BOT_DM, InteractionContextType.GUILD, InteractionContextType.PRIVATE_CHANNEL]
    }
]);

module.exports = { commands }