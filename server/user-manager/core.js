// to link new managers, go to the bottom and add a new call to `addManager` that references the new manager
const AchievementManager = require('./achievements');
const MessageManager = require('./messages');
const UserManager = require('./users');

class GlobalManager {
    static managers = [];
    /**
     * Merges a manager into the global manager
     * @param {Function & { prototype: Object }} constructor 
     */
    static addManager(constructor) {
        this.managers.push(constructor);
        this._composePrototype(constructor.prototype);
    }
    /**
     * Recursively merges some target prototype to ourselves
     * @param {{ [key: any]: any }} prototype 
     */
    static _composePrototype(prototype) {
        if (!prototype) return;
        
        for (const key of Object.getOwnPropertyNames(prototype))
            this.prototype[key] ??= prototype[key];

        prototype = Object.getPrototypeOf(prototype);
        this._composePrototype(prototype);
    }

    /** @type {mongoose.Connection} */
    connection = null;
    /**
     * Manages everything, including the linking of actual managers
     * @param {mongoose.Connection} connection 
     */
    constructor(connection) {
        this.connection = connection;

        GlobalManager.managers.forEach(constructor => Object.assign(this, new constructor(connection)));
    }
}
GlobalManager.addManager(UserManager);
GlobalManager.addManager(MessageManager);
GlobalManager.addManager(AchievementManager);

/** @type {GlobalManager & UserManager & MessageManager * AchievementManager} */
module.exports = GlobalManager;