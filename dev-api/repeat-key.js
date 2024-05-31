mosule.export = function repeatKeyName(key, value, ...alts) {
    const obj = {[key]: value}
    for (const key of alts) {
        obj[key] = value
    }
    return obj
}