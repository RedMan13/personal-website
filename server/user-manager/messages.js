const mongoose = require('mongoose');
const crypto = require('crypto');
const escapeRegex = require('regexp.escape');

const Message = new mongoose.Schema({
    id: String,
    setAt: Date,
    edited: Boolean,
    target: String, // namespace + real target (e.g. private/someone+godslayerakp)
    author: String,
    content: String,
    reference: String // referenced message id
});

class MessageManager {
    /**
     * Manages messages, generically, can be used for any kind of messaging
     * @param {mongoose.Connection} connection 
     */
    constructor(connection) {
        this.messages = connection.model('messages', Message);
    }

    /**
     * Create a new message
     * @param {string} author 
     * @param {{ target: string, content: string, reference: string }} meta The message info
     */
    async createMessage(author, { target, content, reference }) {
        if (!target) throw new TypeError('Target must be specified!');
        if (!content) throw new TypeError('Content must be specified!');
        (await this.messages.create({
            id: crypto.randomUUID(),
            setAt: new Date(),
            edited: false,
            target,
            author,
            content,
            reference
        })).save();
    }
    /**
     * Updates the mutable parts of a message
     * @param {string} id The target message to update
     * @param {{ content: string }} meta The new data to apply to the message
     */
    async updateMessage(id, { content }) {
        if (!content) throw new TypeError('Content must be specified!');
        const message = await this.messages.findOne({ id });
        message.edited = true;
        message.setAt = new Date();
        message.content = content;
        message.save();
    }
    /**
     * Deletes one specific message
     * @param {string} id The target message to remove
     */
    async deleteMessage(id) { await this.messages.deleteOne({ id }); }
    
    /**
     * Get some number of messages
     * @param {string} target From what context to fetch messages
     * @param {number} count How many messages to fetch
     * @param {string?} id Optional message id to start from
     * @returns {Promise<Message[]>}
     */
    async fetchMessages(target, count, id) {
        let position = null;
        if (id) {
            const start = await this.messages.findOne({ id });
            position = { _id: { $lte: start._id } };
        }
        return await this.messages.aggregate([
            { $match: { target } },
            { $sort: { date: 1 } },
            position,
            { $limit: count },
            { $unset: '_id' },
            { $unset: '__v' }
        ].filter(Boolean));
    }
    /**
     * Searches a message context for some key details
     * @param {string} target Where to search inside
     * @param {number} page What page index to start at
     * @param {{ pageLength?: number, descending?: boolean, content?: string, author?: string }} filters 
     * @returns {Promise<Message[]>}
     */
    async searchMessages(target, page = 0, filters) {
        const pages = Math.min(filters.pageLength, 100) || 20;
        return await this.messages.aggregate([
            { $match: { target } },
            filters.content && { $match: {
                content: {
                    $regex: `${escapeRegex(filters.content)}`,
                    $options: 'i'
                }
            } },
            filters.author && { $match: { author: filters.author } },
            { $sort: { date: filters.descending ? 1 : -1 } },
            { $skip: page * pages },
            { $limit: pages },
            { $unset: '_id' },
            { $unset: '__v' }
        ].filter(Boolean));
    }
    /**
     * Purges messages starting from the most recent going down `count` messages
     * @param {string} target From what specific context to purge messages
     * @param {number} count How many messages to remove
     * @param {string?} id Optional message id to start from
     */
    async purgeMessages(target, count, id) {
        let position = null;
        if (id) {
            const start = await this.messages.findOne({ id });
            position = { _id: { $lte: start._id } };
        }
        const messages = await this.messages.find([
            { $match: { target } },
            { $sort: { date: -1 } },
            position,
            { $limit: count }
        ].filter(Boolean));
        await this.messages.deleteMany({ _id: { $in: messages.map(message => message._id) } });
    }

    /**
     * Deletes all messages under a specific target
     * @param {string} target
     */
    async deleteTarget(target) { await this.messages.deleteMany({ target }); }
    /**
     * Finds any message targets that begin with some prefix (namespace, usually)
     * @param {string} prefix 
     * @param {number} page 
     * @param {number?} pages Number of results per page
     * @returns {Promise<string[]>}
     */
    async fetchTargets(prefix, page = 0, pages = 20) {
        const messages = await this.messages.aggregate([
            { $match: {
                target: {
                    $regex: `^${escapeRegex(prefix)}`,
                    $options: 'i'
                }
            } },
            { $group: { _id: '$target' } },
            { $skip: page * pages },
            { $limit: pages }
        ]);

        return messages.map(message => message._id);
    }
}

module.exports = MessageManager;