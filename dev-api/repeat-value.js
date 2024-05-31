module.exports = function repeatValue(value, ...keys) {
    const obj = {}
    for (const key of keys) {
        obj[key] = value
    }
    return obj
}