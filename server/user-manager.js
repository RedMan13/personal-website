const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserProfile = new mongoose.Schema({
    username: String,
    passcode: String, // important note for other people, this is the **HASHED** passcode, not the real password string
    email: String,
    picture: String, // URL to the users profile picture
    banner: String, // URL to the users profile banner
    styles: String, // some CSS styles to apply to whatever profile the user has
    bio: String, // some HTML-coded text for the profile bio
    banned: Boolean // flags being banned
});
const UserAccess = new mongoose.Schema({
    username: String,
    authClass: String // what, by name, they are authorized to use
});
const UsersAgent = new mongoose.Schema({
    username: String,
    details: String
})
const TraficEntry = new mongoose.Schema({
    type: String,
    location: String
});
const Achievement = new mongoose.Schema({
    id: String, // id of the achievement itself
    username: String
});

class UserManager {
    /** @type {mongoose.Connection} */
    connection = null;
    /**
     * Manages everything to do with users, including things like network tracking and achievements
     * @param {mongoose.Connection} connection 
     */
    constructor(connection) {
        this.connection = connection;
        this.profiles = connection.model('user-profiles', UserProfile);
        this.access = connection.model('user-access', UserAccess);
        this.agents = connection.model('user-agents', UsersAgent);
        this.achievements = connection.model('user-achievments', Achievement);
    }
    
    /**
     * Checks if a user exists by name
     * @param {string} username 
     * @returns {Promise<boolean>} If they do or do not exist
     */
    async userExists(username) {
        const user = await this.profiles.exists({ username });
        return !!user;
    }
    /**
     * Checks if the given credentials are valid for logging in the user
     * @param {string} username 
     * @param {string} password The users password string
     * @returns {Promise<boolean>} If the login info is correct
     */
    async authorize(username, password) {
        const user = await this.profiles.findOne({ username });
        if (user.banned) return false; // can not log in to a banned account
        if (!user) return false;
        return bcrypt.compare(password, user.passcode);
    }
    /**
     * Creates a new user and blank profile to go with
     * @param {string} username The new profiles username
     * @param {string} password The new profiles password
     * @param {string} email The email of the user, or blank if none available
     */
    async register(username, password, email = '') {
        const user = await this.profiles.exists({ username });
        if (user) return;
        new UserProfile({
            username,
            passcode: bcrypt.hash(password, 10),
            email
        }).save();
    }
    /**
     * Updates the information on a users profile
     * @param {string} author The username of the user who is authring these changes
     * @param {string} username The username of the person to change
     * @param {string} keys What changes to make
     */
    async updateProfile(author, username, keys) {
        const user = await this.profiles.findOne({ username });
        if (!user) return;
        if (author !== username && !await this.canUse(author, 'edit-users')) return;
        if ('email' in keys) user.email = keys.email;
        if ('bio' in keys) user.bio = keys.bio;
        if ('picture' in keys) user.picture = keys.picture;
        if ('banner' in keys) user.banner = keys.banner;
        if ('styles' in keys) user.styles = keys.styles;
        if ('banned' in keys && await this.canUse(author, 'ban-users'))
            user.banned = keys.banned;
    }
    /**
     * Checks to see if a user can access a given feature
     * @param {string} username The user to verify
     * @param {string} feature The feature name to check for
     * @returns {Promise<boolean>} If the user can or can not use this feature
     */
    async canUse(username, feature) {
        const canUse = await this.access.exists({ username, authClass: feature });
        return !!canUse;
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
    async addAchievement(username, id) { new Achievement({ username, id }).save(); }
    /**
     * Gets only the users profile information
     * @param {string} username 
     * @returns {Promise<Object & { username: string }>}
     */
    async getPartialProfile(username) {
        const user = await this.profiles.findOne({ username });
        const achievements = await this.achievements.aggregate([ { $match: { username } } ]);
        return {
            username,
            bio: user.bio,
            picture: user.picture,
            banner: user.banner,
            styles: user.styles,
            banned: user.banned,
            achievements: achievements.map(v => v.id)
        }
    }
    /**
     * Gets all the users profile information, including thngs like network activity and authorized usages
     * @param {string} username 
     * @returns {Promise<Object & { username: string, authorizations: string[] }>}
     */
    async getFullProfile(username) {
        const basic = await this.getPartialProfile(username);
        const authents = await this.access.aggregate([{ $match: { username } }]);
        const agents = await this.agents.aggregate([{ $match: { username } }]);
        return {
            ...basic,
            authorizations: authents.map(v => v.authClass),
            agents: agents.map(v => v.details)
        }
    }
    /**
     * Logs a single traffic instance
     * @param {'load'|'click'} type The type of traffic
     * @param {Promise<string>} location The location and information about the traffic
     */
    async logTraffic(type, location) {
        new TraficEntry({ type, location }).save();
    }
    /**
     * Logs what agents relate to which users
     * @param {string} agent The useragent related to this traffic
     * @param {Promise<string>} username The user who has that useragent
     */
    async logDeviceUsage(agent, username) {
        if (await this.agents.exists({ details: agent, username })) return;
        new UsersAgent({ username, details: agent }).save();
    }
}

module.exports = UserManager;