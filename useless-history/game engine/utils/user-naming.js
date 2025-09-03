import {partNames} from './parts'

/**
 * all names that have been used per context
 * interface UsedNames {
 *     [string]: { [string]: Boolean }
 * }
 */
const usedNames = {}
// all names that can not be used by the user, even in the save parsing
export const illegalNames = /^(xml|define|pin[1-9][0-9]*|pin\-list)$/i
export const validNameChars = /^[_a-z][a-z0-9_.-]{0,1024}$/i
const extractLastDigets = /^.*([0-9]+)$/i
// messages to show according to what the validate function states
export const validateFailReasons = [
    'Name is safe, this error message should never have been shown',
    'Name is used internally and can not be serialized safely',
    'Name was already used by a previously defined part and cannot be reused',
    'Name is already used by existing parts defined by the program',
    'The characters used in the name are dissaloud'
]

export function validateName(name, context) {
    if (illegalNames.test(name)) return 1 // validateFailReasons[1]
    if (usedNames[context]?.[name]) return 2 // validateFailReasons[2]
    if (partNames.includes(name)) return 3 // validateFailReasons[3]
    if (!validNameChars.test(name)) return 4 // validateFailReasons[4]
    return 0
}
export function fixName(name, context) {
    const failReason = validateName(name, context)
    // ensure the latter fixing has a context to write too
    if (!usedNames[context]) usedNames[context] = {}
    // set in this name so that it can be used later for the funny
    usedNames[context][name] = name.match(extractLastDigets)[1] ?? 1
    
    switch (failReason) {
    // no issues found
    case 0:
        return name
    // the issue is, you used a no good term
    case 1:
        return fixName('internallyProtectedName', context)
    // name already used somewhere else in here
    case 2:
        return name + usedNames[context][name]++
    // so you see, you cant name a component the same as a hardcoded component
    case 3:
        return fixName('nameAlreadyUsedByParts', context)
    case 4:
        if (name.length > 1024) name = name.slice(0, 1024) 
        if (!/[a-z_]/i.test(name[0])) name = '_' + name.slice(1)
        name = name.replaceAll(/[^a-z0-9_.-]/ig, '-')
        return name
    // yeah idunno, this should never happen but possibly can
    defualt:
        console.error('unsupported validation fail reason', failReason, validateFailReasons[reason])
        return validateFailReasons[failReason]
    }
}