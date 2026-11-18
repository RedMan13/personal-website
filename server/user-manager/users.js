const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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
const TokenList = new mongoose.Schema({
    username: String,
    token: String,
    ip: String
});

class UserManager {
    static validUsername(username) {
        return username.replace(/[a-z0-9\-]+/gi, '-');
    }

    /**
     * Manages everything to do with users, including things like network tracking and achievements
     * @param {mongoose.Connection} connection 
     */
    constructor(connection) {
        this.profiles = connection.model('user-profiles', UserProfile);
        this.access = connection.model('user-access', UserAccess);
        this.tokens = connection.model('token-list', TokenList);
    }
    
    /**
     * Checks if a user exists by name
     * @param {string} username 
     * @returns {Promise<boolean>} If they do or do not exist
     */
    async userExists(username) {
        const user = await this.profiles.findOne({ username });
        return !!user;
    }

    /**
     * Obtains an access token for an account
     * @param {string} ip The remote ip that triggered this query. Helps prevent token stealing, maybe
     * @param {string} username 
     * @param {string} password The users password string
     * @returns {Promise<string>} The token to use for this log in
     */
    async getToken(ip, username, password) {
        const user = await this.profiles.findOne({ username });
        if (!user) throw new Error('Bad password or username');
        if (user.banned) throw new Error('User is banned'); // can not log in to a banned account
        const valid = bcrypt.compare(password, user.passcode);
        if (!valid) throw new Error('Bad password or username');

        // if this ip already has a token, then simply use that existing token, dont treat it like a truly new login
        const standing = await this.tokens.findOne({ ip });
        if (standing) return standing.token;

        // if theres toooo many tokens, delete which ever ones come up first for the username and add this one
        const numTokens = await this.tokens.countDocuments({ username });
        if (numTokens > 5) await this.tokens.deleteOne({ username });
        
        const token = crypto.randomUUID(); // token just needs to be entirely unique
        (await this.tokens.create({ token, ip, username })).save();
        return token;
    }
    /**
     * Verifies that a token is valid, and what account that token belongs too
     * @param {string} token
     * @param {string} ip The remote ip that triggered this query
     * @returns {Promise<string?>} The username from the token, or void if token/ip is invalid
     */
    async checkToken(token, ip) {
        const instance = await this.tokens.findOne({ token, ip });
        return instance?.username;
    }

    /**
     * Creates a new user and blank profile to go with
     * @param {string} username The new profiles username
     * @param {string} password The new profiles password
     * @param {string} email The email of the user, or blank if none available
     * @returns {boolean} If the account was registered or not
     */
    async register(username, password, email = '') {
        username = UserManager.validUsername(username);
        const user = await this.userExists(username);
        if (user) return false;
        (await this.profiles.create({
            username,
            passcode: await bcrypt.hash(password, 10),
            email,
            styles: `
.banner {
    display: block;
    width: 100%;
    height: 96px;
    object-fit: cover;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
}
.profile-identity {
    display: flex;
    gap: 10px;
    justify-content: left;
    align-items: center;
    margin: 0px 10px;
    margin-top: -32px;
}
.pfp-image {
    width: 64px;
    border-radius: 25%;
}
.username {
    font-size: large;
    font-weight: bold;
    margin-top: 32px;
    display: inline-block;
}
.bio-text {
    margin: 16px 7px;
    overflow: scroll;
    white-space: preserve;
}
.backdrop {
    border-radius: 16px;
    border: 1px solid #AAA;
    background-color: white;
    margin: 0px;
    font-family: sans-serif;
}`
        })).save();
        return true;
    }
    /**
     * Updates the information on a users profile
     * @param {string} username The username of the person to change
     * @param {string} keys What changes to make
     */
    async updateProfile(username, keys) {
        const user = await this.profiles.findOne({ username });
        if (!user) return;
        // if ('username' in keys) {
        //     await this.tokens.updateMany(
        //         { username: user.username },
        //         { username: keys.username }
        //     );
        //     user.username = keys.username;
        // }
        if ('email' in keys) user.email = keys.email;
        if ('bio' in keys) user.bio = keys.bio;
        if ('picture' in keys) user.picture = keys.picture;
        if ('banner' in keys) user.banner = keys.banner;
        if ('styles' in keys) user.styles = keys.styles;
        user.save();
    }
    async banUser(username) {
        const user = await this.profiles.findOne({ username });
        user.banned = true;
        user.save();
    }
    async unbanUser(username) {
        const user = await this.profiles.findOne({ username });
        user.banned = false;
        user.save();
    }
    /**
     * Checks to see if a user can access a given feature
     * @param {string} username The user to verify
     * @param {string} feature The feature name to check for
     * @returns {Promise<boolean>} If the user can or can not use this feature
     */
    async canUse(username, features) {
        if (Array.isArray(features)) {
            const canUse = this.access.exists({ username, authClass: { $in: features } });
            return !!canUse;
        }
        const canUse = await this.access.exists({ username, authClass: features });
        return !!canUse;
    }
    /**
     * Adds a feature to a users allow list
     * @param {string} username The user to verify
     * @param {string|string[]} features The feature name(s) to check for
     */
    async allowUse(username, features) {
        if (!Array.isArray(features)) features = [features];
        this.access.create(features.map(feature => ({ username, authClass: feature })));
    }
    /**
     * Removes a feature from the users allow list
     * @param {string} username The user to verify
     * @param {string|string[]} features The feature name(s) to check for
     */
    async disallowUse(username, features) {
        if (!Array.isArray(features)) {
            await this.access.deleteOne({ username, authClass: features });
            return;
        }
        await this.access.deleteMany({ username, authClass: { $in: features } });
    }

    /**
     * Gets only the users profile information
     * @param {string} username 
     * @returns {Promise<Object & { username: string }>}
     */
    async getPartialProfile(username) {
        const user = await this.profiles.findOne({ username });
        if (!user) return;
        const achievements = await this.achievements.aggregate([ { $match: { username } } ]);
        return {
            username,
            email: user.email,
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
        if (!basic) return;
        const authents = await this.access.aggregate([{ $match: { username } }]);
        return {
            ...basic,
            authorizations: authents.map(v => v.authClass)
        }
    }
}

module.exports = UserManager;