module.exports.InteractionType = {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
    APPLICATION_COMMAND_AUTOCOMPLETE: 4,
    MODAL_SUBMIT: 5
}
module.exports.InteractionCallbackType = {
    /** ACK a `Ping` */
    PONG: 1,
    /** Respond to an interaction with a message */
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    /** ACK an interaction and edit a response later, the user sees a loading state */
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
    /** For components, ACK an interaction and edit the original message later; the user does not see a loading state */
    DEFERRED_UPDATE_MESSAGE: 6,
    /** For components, edit the message the component was attached to */
    UPDATE_MESSAGE: 7,
    /** Respond to an autocomplete interaction with suggested choices */
    APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
    /** Respond to an interaction with a popup modal */
    MODAL: 9,
    /** **Deprecated**; respond to an interaction with an upgrade button, only available for apps with monetization enabled */
    PREMIUM_REQUIRED: 10,
    /** Launch the Activity associated with the app. Only available for apps with Activities enabled */
    LAUNCH_ACTIVITY: 12
}
module.exports.ApplicationCommandType = {
    /** Slash commands; a text-based command that shows up when a user types `/` */
    CHAT_INPUT: 1,
    /** A UI-based command that shows up when you right click or tap on a user */
    USER: 2,
    /** A UI-based command that shows up when you right click or tap on a message */
    MESSAGE: 3,
    /** A UI-based command that represents the primary way to invoke an app's Activity */
    PRIMARY_ENTRY_POINT: 4
}
module.exports.ApplicationCommandOptionType = {
    SUB_COMMAND: 1,
    SUB_COMMAND_GROUP: 2,
    STRING: 3,
    /** Any integer between -2^53 and 2^53 */
    INTEGER: 4,
    BOOLEAN: 5,
    USER: 6,
    /** Includes all channel types + categories */
    CHANNEL: 7,
    ROLE: 8,
    /** Includes users and roles */
    MENTIONABLE: 9,
    /** Any double between -2^53 and 2^53 */
    NUMBER: 10,
    /** attachment object */
    ATTACHMENT: 11
}
module.exports.ApplicationIntegrationType = {
    /** App is installable to servers */
    GUILD_INSTALL: 0,
    /** App is installable to users */
    USER_INSTALL: 1
}
module.exports.InteractionContextType = {
    /** Interaction can be used within servers */
    GUILD: 0,
    /** Interaction can be used within DMs with the app's bot user */
    BOT_DM: 1,
    /** Interaction can be used within Group DMs and DMs other than the app's bot user */
    PRIVATE_CHANNEL: 2
}
module.exports.EntryPointCommandHandlerType = {
    /** The app handles the interaction using an interaction token */
    APP_HANDLER: 1,
    /** Discord handles the interaction by launching an Activity and sending a follow-up message without coordinating with the app */
    DISCORD_LAUNCH_ACTIVITY: 2
}
module.exports.MessageComponentType = {
    /** Container to display a row of interactive components */
    ActionRow: 1,
    /** Button object */
    Button: 2,
    /** Select menu for picking from defined text options */
    StringSelect: 3,
    /** Text input object */
    TextInput: 4,
    /** Select menu for users */
    UserSelect: 5,
    /** Select menu for roles */
    RoleSelect: 6,
    /** Select menu for mentionables (users and roles) */
    MentionableSelect: 7,
    /** Select menu for channels */
    ChannelSelect: 8,
    /** Container to display text alongside an accessory component */
    Section: 9,
    /** Markdown text */
    TextDisplay: 10,
    /** Small image that can be used as an accessory */
    Thumbnail: 11,
    /** Display images and other media */
    MediaGallery: 12,
    /** Displays an attached file */
    File: 13,
    /** Component to add vertical padding between other components */
    Separator: 14,
    /** Container that visually groups a set of components */
    Container: 17,
    /** Container associating a label and description with a component */
    Label: 18,
    /** Component for uploading files */
    FileUpload: 19
}
module.exports.ComponentButtonStyle = {
    /** The most important or recommended action in a group of options */
    Primary: 1,
    /** Alternative or supporting actions */
    Secondary: 2,
    /** Positive confirmation or completion actions */
    Success: 3,
    /** An action with irreversible consequences */
    Danger: 4,
    /** Navigates to a URL */
    Link: 5,
    /** Purchase */
    Premium: 6
}