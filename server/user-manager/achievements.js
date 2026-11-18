const mongoose = require('mongoose');

const Achievement = new mongoose.Schema({
    id: String, // id of the achievement itself
    userId: String
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
     * @param {string} id User id
     * @returns {Promise<string[]>} The achievement IDs that this user holds
     */
    async getAchievements(id) {
        const achievements = await this.achievements.aggregate([ { $match: { userId: id } } ]);
        return achievements.map(v => v.id);
    }
    /**
     * Adds an achievement to a user
     * @param {string} userId 
     * @param {string} id The id of the achievement to add
     */
    async addAchievement(userId, id) { (await this.achievements.create({ userId, id })).save(); }
}

module.exports = AchievementManager;