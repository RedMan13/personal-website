module.exports = class RollingCache {
    constructor(len) {
        this._cap = len;
        this._keys = [];
        this._cache = {};
        this._held = {};
    }
    getOrMake(key, generator) {
        return this._cache[key] ?? this.push(key, generator());
    }
    get(key) {
        return this._cache[key];
    }
    push(key, value) {
        this._cache[key] = value;
        this._keys.push(key);
        if (this._keys.length > this._cap) {
            const oldKey = this._keys.shift();
            delete this._cache[oldKey];
        }
        
        return value;
    }
}