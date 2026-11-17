const mongoose = require('mongoose');

const Achievement = new mongoose.Schema({
    id: String, // id of the achievement itself
    username: String
});

class AchievementManager {
    /**
     * Manages achievements
     * @param {mongoose.Connection} connection 
     */
    constructor(connection) {
        this.achievements = connection.model('user-achievments', Achievement);
    }
    /**
     * Gets all achievements held by a specific user
     * @param {string} username
     * @returns {Promise<string[]>} The achievement IDs that this user holds
     */
    async getAchievements(username) {
        const achievements = await this.achievements.aggregate([ { $match: { username } } ]);
        return achievements.map(v => v.id);
    }
    /**
     * Adds an achievement to a user
     * @param {string} username 
     * @param {string} id The id of the achievement to add
     */
    async addAchievement(username, id) { (await this.achievements.create({ username, id })).save(); }
}

module.exports = AchievementManager;