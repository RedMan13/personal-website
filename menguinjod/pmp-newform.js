(async () => {
    await new Promise(resolve => {
        const intr = setInterval(() => {
            if (window.ScratchBlocks && window.vm) resolve(clearInterval(intr))
        }, 600)
    }) 
    const { 
        Sprite, // require('../sprites/sprite')
        RenderedTarget, // require('../sprites/rendered-target')
        JSZip, // require('jszip')
        loadCostume, // require('../import/load-costume')
        loadSound, // require('../import/load-sound')
        Blocks, // require('../engine/blocks')
        StageLayering // require('../engine/stage-layering')
    } = vm.exports
    const {
        BlockType, // require('../extension-support/block-type')
        ArgumentType // require('../extension-support/argument-type')
    } = Scratch
    
    /**
     * im doing it this way cause its easier to test (atleast to me it is)
     * load this as an extension then go to the console and run either newSave or newLoad (passing the output of newSave into newLoad)
     * run testSaveLoad to verifiy that save and load works, will report what failed and where
     * this is meant to be just about literally a drop-in replacement for the sb3 loader
     * the format is quite similar to the sb2 format but instead its formated so it can be read by the user as the block-set easily
     */
    
    const reservedNames = ['Stage']
    const singleFieldBlockFields = {
        text: 'TEXT',
        math_number: 'NUM',
        math_integer: 'NUM',
        math_whole_number: 'NUM',
        math_positive_number: 'NUM',
        math_angle: 'NUM',
        matrix: 'MATRIX',
        note: 'NOTE',
        colour_picker: 'COLOUR'
    }
    function castToType(val, type) {
        if (typeof val === type) return val
        switch (type) {
        case 'string':
            return String(val)
        case 'number':
            return Number(val)
        }
    }
    function indentUpTo(str, indent) {
        const lines = str.split('\n')
        const tabs = (new Array(indent -1).fill('\t').join(''))
        let newStr = lines.shift()
        for (const line of lines)
            newStr += `\n${tabs}${line}`
    
        return newStr
    }
    function convertString(str) {
        if (!isNaN(Number(str))) return Number(str)
        if (str === 'true' || str === 'false') return str === 'true'
        return str
    }
    function makeSafe(str, indent) {
        str = convertString(str)
        if (str === '') return '""'
        const gen = JSON.stringify(str) || '""'
        if (indent) return indentUpTo(gen, indent)
        return gen
    }
    function convertToMd5(str) {
        const [name, ext] = str.split('.')
        return `${name.replace(/[^a-z0-9]+/gi, '')}.${ext}`
    }
    
    // swaps the dumb as idea of only using id cross refrencing for js object instancing
    // also performs a deep clone of the block storage
    function fixBlockId(block, baseBlocks, newBlocks, comments, parentWeAreFixingFor) {
        const clone = { 
            ...block,
            inputs: {},
            fields: {},
            parent: parentWeAreFixingFor ?? getOrFixBlockId(block.parent, baseBlocks, newBlocks, comments)
        }
        clone.next = getOrFixBlockId(block.next, baseBlocks, newBlocks, comments, clone)
        if (clone.comment) clone.comment = comments[clone.comment]
    
        for (const [inpId, input] of Object.entries(block.inputs)) 
            clone.inputs[inpId] = {
                ...input,
                block: getOrFixBlockId(input.block, baseBlocks, newBlocks, comments, clone),
                shadow: getOrFixBlockId(input.shadow, baseBlocks, newBlocks, comments, clone)
            }
        for (const [fieldId, field] of Object.entries(block.fields)) 
            clone.fields[fieldId] = { ...field }
    
        return clone
    }
    function getOrFixBlockId(blockId, baseBlocks, newBlocks, comments, uhFuckIdkJustPassThisDown) {
        if (!baseBlocks[blockId]) return null
        if (!newBlocks[blockId]) newBlocks[blockId] = fixBlockId(baseBlocks[blockId], baseBlocks, newBlocks, comments, uhFuckIdkJustPassThisDown)
        return newBlocks[blockId]
    }
    function killIdRefrencing(blocks, comments) {
        const newBlocks = {}
        for (const [blockId, block] of Object.entries(blocks))
            if (!newBlocks[blockId]) newBlocks[blockId] = fixBlockId(block, blocks, newBlocks, comments)
        
        return newBlocks
    }
    
    class FileSpace {
        constructor(context) {
            const uses = {}
    
            return function(str) {
                let fileName = str.replaceAll(/[^a-z0-9\-_ ]/gi, '')
                uses[fileName] ??= reservedNames.includes(fileName) ? 1 : 0
                fileName += uses[fileName]++ || ''
                
                return fileName
            }
        }
    }
    
    // make sure to change the first digit of this when ANY change happens that makes it so that there is 
    // a required property that wasnt there originally or wasnt storing that data originally
    // change the second digit whenever a minor change is made and the first digit hasnt been changed
    // if the first digit has been changed make sure to reset the second one to zero
    const serializerVersion = '0.1'
    const compareVersions = (v1, v2) => {
        v1 = v1.split('.')
        v2 = v2.split('.')
        const v3 = [
            v1[0] - v2[0], 
            v1[1] - v2[1]
        ]
    
        // versionDiff, isNextMajorVersion
        return [v3, v3[0] > 0]
    }
    class UserSave {
        constructor(inputOrder, runtime, singleSprite) {
            this.orderInfo = inputOrder
            this.runtime = runtime
            this.zip = new JSZip()
            // if we should setup the sprite encoder with the expectation to have many other sprites or only this one sprite
            this.spriteRoots = singleSprite
            this.zip.file('meta/input-order.json', JSON.stringify(this.orderInfo))
            this.saveMade = false
            // emit ourselves so that extensions can patch in whatever data they happen to need
            this.runtime.emit('SAVE_CREATING', this)
        }
    
        async encodeExts(opt_filterBlocks) {
            console.log('encoding extensions')
            const makeOk = new FileSpace('extensions')
            const extHndlr = this.runtime.vm.extensionManager
            const usedExtensions = []
            if (opt_filterBlocks) {
                for (const block of opt_filterBlocks) {
                    const extId = block.opcode.split('_')[0]
                    if (!usedExtensions.includes(extId)) usedExtensions.push(extId)
                }
            }
            for (const [extId, serviceName] of extHndlr._loadedExtensions.entries()) {
                console.log('encoding extension', extId)
                // skip unused extensions, if we have a block set to filter to
                if (opt_filterBlocks && !usedExtensions.includes(extId)) continue
                const safeExtId = makeOk(extId)
                // Service names for extension workers are in the format "extension.WORKER_ID.EXTENSION_ID"
                const workerId = +serviceName.split('.')[1];
                const extensionURL = extHndlr.workerURLs[workerId];
    
                const extMeta = {
                    serialized: this.runtime[`ext_${extId}`]?.serialize?.() ?? {},
                    src: extensionURL ?? extId,
                    isInternal: !!extensionURL
                }
                if (extensionURL) {
                    const extText = extHndlr.extUrlCodes[extensionURL]
    
                    extMeta.hash = extHndlr.extensionHashes[extensionURL]
                    extMeta.useLocalFirst = extHndlr.keepOlder.includes(extId)
                    this.zip.file(`extensions/${safeExtId}/code.js`, extText)
                }
                this.zip.file(`extensions/${safeExtId}/meta.json`, JSON.stringify(extMeta, null, '\t'))
            }
        }
    
        getConstant(block, indent) {
            const isConstant = 
                Object.keys(block.inputs).length === 0 &&
                Object.keys(block.fields).length === 1 &&
                block.shadow
            if (isConstant) {
                const firstField = Object.values(block.fields)[0]
                return makeSafe(firstField.value)
            }
            if (block.opcode === 'polygon') {
                const points = []
                for (let i = 1; i <= +block.mutator.points; i++)
                    points.push([block.inputs[`${i}x`], block.inputs[`${i}y`]])
    
                return JSON.stringify(points)
            }
    
            return this.getStackRender(block, indent, true)
        }
        getStackRender(block, indent, inInput) {
            if (!block?.opcode) {
                console.error('oopies!!!!', block, 'isnt a valid block')
                return ''
            }
            console.log('encoding block', block)
            const base = (new Array(indent).fill('\t').join(''))
            // omg omg omg okmgomogmoggomgogmogmogmggj m
            // its a PRCECDUUDURUEU LBOCKKCKCLBOLCBLCOBCLKB<CK
            // oh yeah btw for any future devs just so you know, this is one of the places 
            // where you will have the most pain if you change procedures in anyway
            // specifically: change the mutation save data at all or change what all procedures can render
            if (block.opcode === 'procedures_call') {
                console.log('encoding as procedure')
                const blockText = block.mutation.proccode
                const inputIds = JSON.parse(block.mutation.argumentids)
                const fixedName = blockText.replaceAll(/%[bns]|[^a-z]/gi, '')
                const gen = [`["procedure:${fixedName}"`]
                
                let inpIdx = 0
                for (const m of blockText.matchAll(/%([bns])/gi)) {
                    const inpName = inputIds[inpIdx]
                    const input = block.inputs[inpName]
                    gen.push(this.getConstant(input.block ?? input.shadow, indent))
                    inpIdx++
                }
    
                let serialized = gen.join(', ')
                serialized += ']'
                if (block.next) serialized += `,\n${this.getStackRender(block.next, indent)}`
        
                return inInput
                    ? serialized
                    : base + serialized
            }
    
            console.log('encoding as internal/extension')
            const [category, ...blockOpcode] = block.opcode.split('_')
            const blockName = `${category}:${blockOpcode.join('_')}`
            // single-field non-shadow blocks get serialized as there lone field (i.e. variables)
            const json = [`[${makeSafe(blockName)}`]
            if (!this.orderInfo[block.opcode]) console.error('HAHA LLLLLLLL')
            for (const [form, name, ...extra] of this.orderInfo[block.opcode]) {
                console.log('handling input', [form, name, ...extra], 'for block', block.opcode)
                switch (form) {
                // fields and variables serialize identically
                case 'variable':
                case 'field':
                    const [fieldName, varType] = extra
                    const field = block.fields[name]
                    const isSingleFielded = 
                        Object.keys(block.inputs).length === 0 &&
                        Object.keys(block.fields).length === 1 &&
                        (fieldName === 'field_label_serializable' || typeof varType !== 'undefined')
                    console.log('block is single fielded?', isSingleFielded)
                    if (isSingleFielded) {
                        let prefix = 'variable'
                        if (varType) prefix = varType
                        // encode custom block args with the prefix "arg"
                        if (fieldName === 'field_label_serializable')
                            prefix = 'argument'
    
                        json.push(`[${makeSafe(`${prefix}:${field.value}`)}`)
                        break
                    }
                    if (fieldName === 'field_checkbox') {
                        json.push(`"${field.value ? '>' : '<'}"`)
                        break
                    }
                    json.push(makeSafe(field.value))
                    break
                case 'input': {
                    const input = block.inputs[name]
                    if (!input) {
                        json.push('""')
                        break
                    }
                    json.push(this.getConstant(input.block ?? input.shadow, indent))
                    break
                }
                case 'statement': {
                    const input = block.inputs[name]
                    if (!input) {
                        json.push('[]')
                        break
                    }
                    json.push('[\n')
                    json.push(this.getStackRender(input.block, indent +1))
                    json.push(`\n${base}]`)
                    break
                }
                }
            }
            if (block.comment) {
                const comment = block.comment
                const x = makeSafe(Math.round(comment.x))
                const y = makeSafe(Math.round(comment.y))
                const minimized = `"${comment.minimized ? '^' : 'v'}"`
                const text = makeSafe(comment.text)
                const width = makeSafe(Math.round(comment.width))
                const height = makeSafe(Math.round(comment.height))
                // kinda confusing
                // but basically [x,y, content, minimized, width,height] so like [0, 0, "v", "im a funky little guy!", 200,200]
                json.push(`[${x},${y}, ${minimized}, ${text}, ${width},${height}]`)
            }
            let serialized = json.join(', ')
            serialized += ']'
            if (block.next) serialized += `,\n${this.getStackRender(block.next, indent)}`
    
            return inInput
                ? serialized
                : base + serialized
        }
        getScriptRenders(target) {
            const {_scripts: scripts, _blocks} = target.blocks
            // if this sprite is the only sprite, then encode the exts with a filter set off what we grabbed
            if (this.spriteRoots) this.encodeExts(Object.values(_blocks))
            const blocks = killIdRefrencing(_blocks, target.comments)
            let indent = 2
            const tabage = (new Array(indent).fill('\t').join(''))
            const base = tabage.slice(0, -1)
            // its missing an eye cause i need it to not collide
            let scrpts = '[\n'
            // short hand for custom blocks cause idk r=trollrands
            let cbs = '[\n'
    
            for (const blockId of scripts) {
                const block = blocks[blockId]
                const isProcDef = block.opcode === 'procedures_definition' ||
                                block.opcode === 'procedures_definition_return'
                // harmless change that makes it so i dont need to define more variables
                block.x = Math.round(block.x ?? 0)
                block.y = Math.round(block.y ?? 0)
                let json = `${tabage}[${block.x},${block.y}, `
                if (isProcDef) {
                    const proto = block.inputs['custom_block'].block
                    const returnType = JSON.parse(proto.mutation.optype)
                    const blockText = proto.mutation.proccode
                    const inputNames = JSON.parse(proto.mutation.argumentnames)
                    const colors = JSON.parse(proto.mutation.color)
                    const returns = JSON.parse(proto.mutation.returns)
                    
                    json += '"'
                    if (returns) json += returnType === 'boolean'
                        ? '<'
                        : '('
                    
                    let inpIdx = 0
                    let lastIndex = 0
                    for (const {'1': type, index} of blockText.matchAll(/%([bns])/gi)) {
                        json += makeSafe(blockText.slice(lastIndex, index)).slice(1, -1)
                        
                        json += type === 'b' ? ' <' : ' ['
                        json += makeSafe(inputNames[inpIdx]).slice(1, -1)
                        json += type === 'b' ? '> ' : '] '
                        
                        lastIndex = index +2
                        inpIdx++
                    }
                    json += blockText.slice(lastIndex, blockText.length +1)
                    
                    json += ' :: '
                    json += colors?.[0] ?? 'custom'
                    if (proto.mutation.warp === 'true') json += ' warp'
                    if (returnType === 'end') json += ' cap'
                    
                    if (returns) json += returnType === 'boolean'
                        ? '>'
                        : ')'
                    json += '", '
                }
                const entryBlock = isProcDef 
                    ? block.next 
                    : block
                if (entryBlock) {
                    json += '[\n'
                    json += this.getStackRender(entryBlock, indent +1)
                    json += `\n${tabage}]`
                } else
                    json += '[]'
                // duplicate of normal blocks, just here so dat weeeeeee can handle the funky thingy called custom blocks
                if (block.comment && isProcDef) {
                    const comment = block.comment
                    const x = makeSafe(Math.round(comment.x))
                    const y = makeSafe(Math.round(comment.y))
                    const minimized = `"${comment.minimized ? '^' : 'v'}"`
                    const text = makeSafe(comment.text)
                    const width = makeSafe(Math.round(comment.width))
                    const height = makeSafe(Math.round(comment.height))
                    // kinda confusing
                    // but basically [x,y, content, minimized, width,height] so like [0, 0, "v", "im a funky little guy!", 200,200]
                    json += `, [${x},${y}, ${minimized}, ${text}, ${width},${height}]`
                }
                json += '],\n'
    
                if (isProcDef)
                    cbs += json.slice(0, -2)
                else
                    scrpts += json.slice(0, -2)
            }
            scrpts += `${base}]`
            cbs += `${base}]`
            if (scrpts.length <= indent +4) scrpts = '[]'
            if (cbs.length <= indent +4) cbs = '[]'
            
            return `{\n\t"scripts": ${scrpts},\n\t"custom-blocks": ${cbs}\n}`
        }
        
        serializeValue(value, isInList) {
            // make a shalow clone of the list, serializing all contained values
            if (Array.isArray(value) && !isInList) {
                const newArray = []
                for (const item of value)
                    newArray.push(this.serializeValue(item))
    
                return newArray
            }
    
            if (!value.customId) return convertString(value)
            const serializer = this.runtime.serializers[value.customId]
            return serializer.serialize(value)
        }
    
        async generateSpriteFileTree(target, makeSpriteOk, targetIndex) {
            console.log('packaging target', target.sprite.name)
            const name = target.isStage
                ? 'Stage'
                : makeSpriteOk(target.sprite.name)
            const costumeName = target.isStage 
                ? 'backdrops'
                : 'costumes'
            // we do a funky monkey if we dont expect anyone else to be here with us
            const root = this.spriteRoots
                ? ''
                : `sprites/${name}`
            const makeOk = new FileSpace()
    
            console.log('generating code for sprite')
            this.zip.file(`${root}/code.json`, this.getScriptRenders(target))
    
            console.log('encoding sprite variables')
            const vars = {}
            if (!target.isStage) {
                vars['name'] = target.sprite.name
                vars['showing'] = target.rotationStyle
                vars['showing'] = target.visible
                vars['position-X'] = target.x
                vars['position-Y'] = target.y
                vars['direction'] = target.direction
                vars['size'] = target.size
                vars['stretch-X'] = target.stretch[0]
                vars['stretch-Y'] = target.stretch[1]
                vars['rotation style'] = target.rotationStyle
                vars['layer#'] = target.getLayerOrder()
                vars['sprite#'] = targetIndex
            }
            vars['volume'] = target.volume
            vars[`${costumeName.slice(0, -1)}#`] = target.currentCostume +1
            vars[costumeName] = {}
            vars['sounds'] = {}
            
            const reservedTypes = Object.keys(vars)
            vars['variables'] = {}
            vars['lists'] = {}
            console.log('encoding users variables')
            for (const variable of Object.values(target.variables)) {
                let type = variable.type
                if (type === '') type = 'variables'
                if (type === 'list') type = 'lists'
                if (type === 'broadcast_msg') continue
                // skib zeh bad
                if (reservedTypes.includes(type)) continue
    
                vars[type] ??= {}
                vars[type][variable.name] = variable.serialize
                    ? variable.serialize()
                    : this.serializeValue(variable.value)
            }
    
            console.log('saving costumes for sprite')
            // minor change, just trying to make it make sense for the user
            this.zip.folder(`${root}/${costumeName}`)
            // fun fact: unlike sounds, we do actually require like 40% of the data inside of a costume item
            for (const costume of target.sprite.costumes) {
                console.log('saving', costume.name)
                const fileName = `${makeOk(costume.name)}.${costume.dataFormat}`
                this.zip.file(`${root}/${costumeName}/${fileName}`, costume.asset.data)
                // implement the JOEMAMAM data causethis data is required
                const costumeMeta = {
                    'file': fileName,
                    'editor-offset X': Math.ceil(costume.rotationCenterX - (costume.size[0] / 2)),
                    'editor-offset Y': Math.ceil(costume.rotationCenterY - (costume.size[1] / 2))
                }
                if (costume.dataFormat !== 'svg') costumeMeta['pixel size'] = costume.bitmapResolution
                vars[costumeName][costume.name] = costumeMeta
            }
            console.log('saving sound for sprite')
            this.zip.folder(`${root}/sounds`)
            // fun fact: like 90% of the data that makes a sound item can just be ignored for serializing
            for (const sound of target.sprite.sounds) {
                console.log('saving', sound.name)
                const fileName = `${makeOk(sound.name)}.${sound.dataFormat}`
                this.zip.file(`${root}/sounds/${fileName}`, sound.asset.data)
                vars.sounds[sound.name] = fileName
            }
            
            this.zip.file(`${root}/vars.json`, JSON.stringify(vars, null, '\t'))
        }
    
        // encode all of the extensions, sprites and global info
        async packageRuntime() {
            console.log('begining the  creation of a new save')
            const makeSpriteOk = new FileSpace()
            // map of id's so that things like extensions can have an easier time getting what the had
            const targetIds = {}
            let stage = null
            // try to perform serialization of big things like targets and extensions in paralel instead of in serial
            const paralelized = [this.encodeExts()]
            for (const target of this.runtime.targets) {
                console.log('found target', target)
                if (!target.isOriginal) continue
                if (target.isStage) stage = target
                paralelized.push(this.generateSpriteFileTree(target, makeSpriteOk))
            }
    
            const index = {
                'version': serializerVersion,
                'fromServer': false,
                'tempo': stage.tempo,
                'video transparency': stage.videoTransparency,
                'video on': stage.videoState,
                'tts language': stage.textToSpeechLanguage,
                'stage width': this.runtime.stageWidth,
                'stage height': this.runtime.stageHeight,
                'max clones': this.runtime.runtimeOptions.maxClones,
                'remove misc limits': this.runtime.runtimeOptions.miscLimits,
                'fencing enabled?': this.runtime.runtimeOptions.fencing,
                'dangerous optimizations enabled?': this.runtime.runtimeOptions.dangerousOptimizations,
                'framerate': this.runtime.frameLoop.framerate,
                'interpolation enabled?': this.runtime.interpolationEnabled,
                'turbo mode': this.runtime.turboMode,
                'high-quality pen enabled?': this.runtime.renderer?.useHighQualityRender ?? true,
                // i was lazy ok!!!!!!!!!
                'monitors': this.runtime._monitorState.valueSeq()
                    // Don't include hidden monitors from extensions
                    // https://github.com/LLK/scratch-vm/issues/2331
                    .filter(monitorData => {
                        const extensionID = monitorData.opcode.split('_')[0];
                        return !extensionID || monitorData.visible;
                    })
                    .map(monitorData => {
                        const serializedMonitor = {
                            id: monitorData.id,
                            mode: monitorData.mode,
                            opcode: monitorData.opcode,
                            params: monitorData.params,
                            spriteName: monitorData.spriteName,
                            value: Array.isArray(monitorData.value) ? [] : 0,
                            width: monitorData.width,
                            height: monitorData.height,
                            x: monitorData.x - xOffset,
                            y: monitorData.y - yOffset,
                            visible: monitorData.visible
                        };
                        if (monitorData.mode !== 'list') {
                            serializedMonitor.sliderMin = monitorData.sliderMin;
                            serializedMonitor.sliderMax = monitorData.sliderMax;
                            serializedMonitor.isDiscrete = monitorData.isDiscrete;
                        }
                        return serializedMonitor;
                    })
            }
            this.zip.file('index.json', JSON.stringify(index, null, '\t'))
    
            this.saveMade = true
    
            return Promise.all(paralelized)
        }
    
        async getZipData(type = 'blob') {
            if (!this.saveMade) await this.packageRuntime()
            return this.zip.generateAsync({
                type,
                mimeType: 'application/x.penguinmod.pmp',
                compression: 'DEFLATE'
            })
        }
    }
    
    function genShadow(blocks, parent, opcode, name, value) {
        const blockObj = {
            opcode,
            id: Math.random().toString.split('.')[1],
            parent,
            inputs: {},
            fields: {
                [name]: { name, value }
            },
            shadow: true
        }
        blocks[blockObj.id] = blockObj
        return blockObj.id
    }
    function attemptFormProcedureBlock(block, parent, isInInput, stackTrace, blocks, procedures, comments, orderInfo) {
        const blockObj = {
            opcode: 'procedure_call',
            id: stackTrace.join(','),
            inputs: {},
            fields: {},
            mutation: procedures[proccode],
            parent
        }
        if (!isInInput) blocks[parent].next = blockObj.id
    
        const proccode = block.shift().split(':')[1]
        if (!procedures[proccode]) {
            procedures.__waiting__[proccode] ??= []
            procedures.__waiting__[proccode].push(block, stackTrace)
            return stackTrace.join(',')
        }
        
        for (let idx = 1; idx < (block.length -1); idx++) {
            const value = block.shift()
            const shadow = type !== 'b' && genShadow(blocks, blockObj.id, 'text', Array.isArray(value) ? '' : value)
            blockObj.inputs[idx] = {
                shadow,
                name: idx.toString(),
                block: Array.isArray(value) 
                    ? convertBlockToShittyAss(value, blockObj.id, true, [...stackTrace, idx.toString()], blocks, procedures, comments, orderInfo)
                    : shadow
            }
        }
        
        if (code[0]) {
            const comment = code.shift()
            comments[`${stackTrace},comment`] = {
                x: comment[0],
                y: comment[1],
                minimized: comment[2] === '^',
                text: comment[3],
                width: comment[4],
                height: comment[5],
            }
            headBlock.comment = `${stackTrace},comment`
        }
    
        return blockObj.id
    }
    function convertBlockToShittyAss(block, parent, isInInput, stackTrace, blocks, procedures, comments, orderInfo) {
        if (!block[0].split(':')[0] === 'procedure') return attemptFormProcedureBlock(block, parent, isInInput, stackTrace, blocks, procedures, comments, orderInfo)
        const blockObj = {
            opcode: block.shift().replace(':', '_'),
            id: stackTrace.join(','),
            fields: {},
            inputs: {},
            parent
        }
        if (!isInInput) blocks[parent].next = blockObj.id
        
        for (const [form, name, ...extra] of this.orderInfo[block.opcode]) {
            const value = block.shift()
            if (typeof value === 'undefined') 
                throw new Error(`Unexpected Block Shape: Block ${block.opcode} at ${stackTrace.join(',')} had to few inputs according to the workspace`)
            switch (form) {
            case 'variable':
            case 'field':
                const fieldObj = { 
                    name,
                    value
                }
                if (form === 'variable') {
                    fieldObj.id = fieldObj.value
                    fieldObj.variableType = extra[0]
                }
                fields[name] = fieldObj
                break
            case 'statement':
            case 'input':
                const { type, fieldName, value: defaultValue } = extra[0]
                const defaultBlock = genShadow(blocks, blockObj.id, type, fieldName, Array.isArray(connectedBlock) ? defaultValue : value)
                blocks[defaultBlock.id] = defaultBlock
                const inputObj = { 
                    name,
                    block: defaultBlock.id,
                    shadow: defaultBlock.id
                }
                if (Array.isArray(value)) 
                    if (form === 'statement') {
                        let firstBlockId = null
                        let lastBlockId = blockObj.id
                        let firstInInput = true
                        for (const [idx, block] of Object.entries(value)) {
                            const blockId = convertBlockToShittyAss(block, lastBlockId, firstInInput, [...stackTrace, name, idx], blocks, procedures, comments, orderInfo)
                            firstBlockId ??= lastBlockId = blockId
                            firstInInput = false
                        }
                        inputObj.block = firstBlockId
                        inputObj.shadow = null
                    } else
                        inputObj.block = convertBlockToShittyAss(value, blockObj.id, true, [...stackTrace, name], blocks, procedures, comments, orderInfo)
    
                blockObj.inputs[name] = inputObj
                break
            }
        }
        
        if (code.length > 1) 
            throw new Error(`Invalid Block Shape: Block ${block.opcode} at ${stackTrace.join(',')} had more inputs then defined by the workspace`)
        if (code[0]) {
            const comment = code.shift()
            comments[`${stackTrace},comment`] = {
                x: comment[0],
                y: comment[1],
                minimized: comment[2] === '^',
                text: comment[3],
                width: comment[4],
                height: comment[5],
            }
            headBlock.comment = `${stackTrace},comment`
        }
        return block.id
    }
    // converts scratchblock syntax into a stream of data for us to read
    const customBlockParser = /((?<NSPreText>.+?)\[(?<NSArgName>.+?)\]|(?<BPreText>.+?)\<(?<BArgName>.+?)\>|(?<EndText>[^:]*)::(?<ControlArgs>.*)$)/gi
    const extBlockTextParser = /((?<preText>.+?)\[(?<argName>.+?)\]|(?<endText>.+?)$)/gi
    function injectBlocksInto(blocks, procedures, comments, stackStart, code, blockOrder) {
        const stackTrace = [...stackStart, 0]
        const isProcDef = typeof code[2] === 'string'
        const innerBlocks = isProcDef
            ? code[3]
            : code[2]
    
        let lastBlockId = null
        let firstBlockId = null
        if (isProcDef) {
            const headBlock = {
                opcode: 'procedures_prototype',
                id: Math.random().toString().split('.')[1],
                inputs: {},
                fields: {},
                mutation: {},
                shadow: true
            }
            const containerBlock = {
                opcode: returns ? 'procedure_definition_returns' : 'procedure_definition',
                id: stackTrace.join(',') + ',procdef',
                inputs: {
                    custom_block: {
                        name: 'custom_block',
                        block: headBlock.id,
                        shadow: headBlock.id
                    }
                },
                fields: {}
            }
            blocks._blocks[containerBlock.id] = containerBlock
            firstBlockId = containerBlock.id
            
            let text = ''
            let iconURL = null
            const argNames = []
            const defaultValues = []
            let color = '#ff0000'
            let shape = 'statement'
            let warps = false
            let returns = false
    
            // if its an object then parse as an extension block
            if (typeof code[2] === 'object') {
                const extBlock = code[2]
                color = [blockInfo.color1, extBlock.color2, extBlock.color3],
                iconURL = blockInfo.blockIconURI
                                              
                switch (blockInfo.blockType) {
                case BlockType.COMMAND:
                    shape = 'command'
                    break;
                case BlockType.REPORTER:
                    shape = 'string'
                    returns = true
                    break;
                case BlockType.BOOLEAN:
                    shape = 'boolean'
                    returns = true
                    break;
                // currently unsupported
                case BlockType.HAT:
                case BlockType.EVENT:
                case BlockType.CONDITIONAL:
                case BlockType.LOOP:
                    throw new Error(`Block type ${blockInfo.blockType} is currently unsupported by custom blocks`)
                default:
                    throw new Error(`Invalid block type ${blockInfo.blockType}`)
                }
                if (blockInfo.terminal) shape = 'end'
    
                if (blockInfo.branchCount > 0) console.warn('Block Substacks are currently unsupported by custom blocks')
                if (typeof blockInfo.blockShape === 'number') console.warn('Forced block shapes are currently unsupported by custom blocks')
                if (blockInfo.forceOutputType) shape = blockInfo.forceOutoutType
    
                const renderText = Array.isArray(extBlock.text) 
                    ? renderText.join(' ') 
                    : extBlock.text
                for (const { groups: args } of renderText.matchAll(extBlockTextParser)) {
                    text += args.preText ?? args.endText
                    
                    const argumentInfo = blockInfo.arguments[args.argName]
                    if (argumentInfo) {
                        switch (argumentInfo.type) {
                        case ArgumentType.STRING:
                            text += '%s'
                            defaultValues.push(argumentInfo.defaultValue ?? '')
                            argNames.push(argName)
                            break
                        case ArgumentType.ANGLE:
                            console.warn('argument type angle is unsupported, but is replaced with number')
                        case ArgumentType.NUMBER:
                            text += '%n'
                            defaultValues.push(argumentInfo.defaultValue ?? 0)
                            argNames.push(argName)
                            break
                        case ArgumentType.BOOLEAN:
                            text += '%b'
                            defaultValues.push(argumentInfo.defaultValue ?? false)
                            argNames.push(argName)
                            break
                        // unsupported argument types
                        case ArgumentType.COLOR:
                        case ArgumentType.MATRIX:
                        case ArgumentType.NOTE:
                        case ArgumentType.IMAGE:
                        case ArgumentType.POLYGON:
                        case ArgumentType.COSTUME:
                        case ArgumentType.SOUND:
                        case ArgumentType.VARIABLE:
                        case ArgumentType.LIST:
                        case ArgumentType.BROADCAST:
                            throw new Error(`Argument type ${argumentInfo.type} is currently unsupported by custom blocks`)
                        default:
                            throw new Error(`Invalid argument type ${argumentInfo.type}`)
                        }
                    }
                }
            }
            // else parse as scratchblock
            else
                for (const { '0': style, groups: arg } of code[2].matchAll(customBlockParser)) {
                    if (!(arg.NSPreText || arg.BPreText || arg.EndText) && !(arg.NSArgName || BArgName)) {
                        if (style === '<') {
                            shape = 'boolean'
                            returns = true
                        }
                        if (style === '(') {
                            shape = 'string'
                            returns = true
                        }
                        continue
                    }
                        
                    text += arg.NSPreText || arg.BPreText || arg.EndText
                    if (arg.ControlArgs) {
                        const controls = ControlArgs.split(' ')
                        warps = controls.includes('warp')
                        if (controls.includes('cap')) shape = 'end'
                        color = [controls.find(arg => /^#[0-9a-z]{6}$/.test(arg))]
                        continue
                    }
                    const isBoolean = !!arg.BArgName
                    text += isBoolean ? '%b' : '%s'
        
                    argNames.push(arg.NSArgName || arg.BArgName)
                }
    
            if (code[4]) {
                comments[`${stackTrace},comment`] = {
                    x: comment[0],
                    y: comment[1],
                    minimized: comment[2] === '^',
                    text: comment[3],
                    width: comment[4],
                    height: comment[5],
                }
                headBlock.comment = `${stackTrace},comment`
            }
            headBlock.mutation = {
                tagName: 'mutation',
                children: iconURL ? [iconURL] : [],
                // for real though, when is this ever used
                argumentdefaults: JSON.stringify(defaultValues),
                argumentids: JSON.stringify(argNames.map((name, idx) => String(idx +1))),
                argumentnames: JSON.stringify(argNames),
                proccode: text,
                color: JSON.stringify(color),
                warp: warps,
                optype: shape,
                edited: true
            }
            const fixedName = text.replaceAll(/%[bns]|[^a-z]/gi, '')
            procedures[fixedName] = head.mutation
            for (const block of procedures.__waiting__[fixedName] ?? []) {
                block.mutation = mutation
            }
            blocks._blocks[headBlock.id] = headBlock
        }
        
        lastBlockId = containerBlock.id
        for (const block of innerBlocks) {
            const blockId = convertBlockToShittyAss(block, lastBlockId, false, stackTrace, blocks._blocks, procedures, comments, orderInfo)
            firstBlockId ??= blockId
            lastBlockId = blockId
        }
    
        blocks._scripts.push(firstBlockId)
        blocks._blocks[firstBlockId].x = code[0]
        blocks._blocks[firstBlockId].y = code[1]
        blocks._blocks[firstBlockId].topLevel = true
    }
    function createAssetObj(storage, name, assetType, dataFormat, data) {
        const asset = storage.createAsset(
            assetType,
            dataFormat,
            data,
            null,
            true // generate md5
        );
    
        return {
            name,
            dataFormat: dataFormat,
            asset: asset,
            md5: `${asset.assetId}.${dataFormat}`,
            assetId: asset.assetId
        };
    }
    async function makeTargetFrom(folder, runtime, blockOrder, isStage) {
        if (!folder) throw new Error(isStage ? `Missing required Stage sprite` : 'Recieved a non-existent folder from zip.forEach')
        const vars = JSON.parse(await folder.file('vars.json').async('string'))
        const code = JSON.parse(await folder.file('code.json').async('string'))
        const costumeName = isStage
            ? 'backdrops'
            : 'costumes'
    
        const procedures = {}
        const comments = {}
        const blocks = new Blocks(runtime, false)
        for (const [idx, script] of Object.entries(code['custom-blocks']))
            injectBlocksInto(blocks, procedures, comments, ['custom-blocks', idx], script, blockOrder)
        for (const [idx, script] of Object.entries(code.scripts))
            injectBlocksInto(blocks, procedures, comments, ['scripts', idx], script, blockOrder)
    
        const sprite = new Sprite(blocks, runtime)
        sprite.name = 'Stage'
        for (const [name, fileMeta] of Object.entries(vars[costumeName])) {
            const data = await folder.file(`${costumeName}/${fileMeta.file}`).async('uint8array')
            const assetType = typeof fileMeta['pixel size'] !== 'undefined'
                ? runtime.storage.AssetType.ImageBitmap
                : runtime.storage.AssetType.ImageVector
            const costumeObj = createAssetObj(runtime.storage, name, assetType, fileMeta.file.split('.')[1], data)
            costumeObj.rotationCenterX = fileMeta['editor-offset X']
            costumeObj.rotationCenterY = fileMeta['editor-offset Y']
            costumeObj.bitmapResolution = fileMeta['pixel size']
            const loadedCostume = await loadCostume(costumeObj.md5, costumeObj, runtime, sprite.soundBank)
            sprite.costumes_.push(loadedCostume)
        }
        for (const [name, fileName] of Object.entries(vars.sounds)) {
            const data = await folder.file(`sounds/${fileName}`).async('uint8array')
            const soundObj = createAssetObj(runtime.storage, name, runtime.storage.AssetType.Sound, fileName.split('.')[1], data)
            const loadedSound = await loadSound(soundObj, runtime, sprite.soundBank)
            sprite.sounds.push(loadedSound)
        }
    
        const target = new RenderedTarget(sprite, runtime)
        if (!isStage) {
            sprite.name = vars['name']
            target.visible = vars['showing']
            target.x = vars['position-X']
            target.y = vars['position-X']
            target.direction = vars['direction']
            target.size = vars['size']
            target.stretch = [vars['stretch-X'], vars['stretch-Y']]
            target.layerOrder = vars['layer#']
            target.spriteOrder = vars['sprite#']
            target.rotationStyle = vars['rotation style']
        }
        target.volume = vars['volume']
        target.currentCostume = vars[`${costumeName.slice(0, -1)}#`] -1
        target.isStage = isStage
        // load internal vars
        for (const [name, value] of Object.entries(vars['variables'])) 
            target.createVariable(null, name, '', value, name.startsWith('☁ '))
        
        for (const [name, value] of Object.entries(vars['lists'])) 
            target.createVariable(null, name, 'list', value)
        
        for (const type in runtime._extensionVariables) {
            if (!vars[type]) continue
            for (const variable of Object.values(vars[type])) {
                const variable = runtime.newVariableInstance(type, ...variable)
                if (variable.mustRecreate) {
                    console.warn('ignoring invalid variable', type, variable)
                    continue
                }
                target.variables[variable.id] = variable
            }
        }
    
        const layer = isStage
            ? StageLayering.BACKGROUND_LAYER
            : StageLayering.SPRITE_LAYER
        console.log(layer)
        target.initDrawable(layer)
        target.updateAllDrawableProperties()
        return target
    }
    async function loadFromSource(data, vm, inputOrder) {
        if (typeof data === 'string')
            data = fetch(data).then(req => req.blob())
        
        const zip = await JSZip.loadAsync(data)
        const index = JSON.parse(await zip.file('index.json').async('string'))
        const extensions = zip.folder('extensions')
        extensions.forEach(async function(path, file) {
            const [folder, part] = path.split('/')
            if (part !== 'meta.json') return
            const meta = JSON.parse(await file.async('string'))
            
            const localCode = `data:application/javascript;base64,${await extensions.file(`${folder}/code.js`).async('base64')}`
            const toLoad = meta.useLocalFirst && !meta.isInternal
                ? localCode 
                    ? localCode 
                    : meta.url
                : meta.isInternal
                    ? meta.url
                    // verify the url, if the url doesnt work then use the local code
                    : await fetch(meta.url)
                        .then(req => req.text())
                        .then(js => `data:application/javascript;base64,${btoa(js)}`)
                        .catch(() => localCode)
            
            const ids = await vm.extensionManager.loadExtensionURL(toLoad, meta.hash)
                // catch with a new promise for loading the local version
                .catch(reason => reason === 'useLocal' && vm.extensionManager.loadExtensionURL(localCode))
            if (!ids) return
            for (const id of ids) {
                vm.runtime[`ext_${id}`].deserialize?.(meta.serialized)
            }
        })
    
        const blockOrder = JSON.parse(await zip.file('meta/input-order.json').async('string') || "null") ?? inputOrder
        const sprites = zip.folder('sprites')
        
        const stage = await makeTargetFrom(zip.folder('sprites/Stage'), vm.runtime, blockOrder, true)
        stage.tempo = index['tempo']
        stage.videoTransparency = index['video transparency']
        stage.videoState = index['video on']
        stage.textToSpeechLanguage = index['tts language']
        // stage is always first
        stage.layerOrder = 0
        vm.runtime.targets.push(stage)
        vm.runtime.executableTargets.push(stage)
        this.setFramerate(index['framerate']);
        if (index['turbo mode enabled?']) {
            this.turboMode = true;
            this.emit(Runtime.TURBO_MODE_ON);
        }
        this.setInterpolation(index['interpolation enabled?']);
        this.setRuntimeOptions({
            maxClones: index['max clones'],
            fencing: index['fencing enabled?'],
            dangerousOptimizations: index['dangerous optimizations enabled?'],
            miscLimits: index['remove misc limits'],
        });
        this.renderer.setUseHighQualityRender(index['high-quality pen enabled?']);
        vm.runtime.setStageSize(index['stage width'], index['stage height'])
        
        sprites.forEach(async function(path) {
            const [folder, part] = path.split('/')
            if (part !== 'vars.json' || folder === 'Stage') return
            const target = await makeTargetFrom(sprites.folder(folder), vm.runtime, blockOrder)
    
            // if sprite order is 0 then push the target, as stage is always the first target
            vm.runtime.targets[target.spriteOrder || vm.runtime.targets.length] = target
            // make sure we go bellow the target above us in the layer order
            const biggerFish = vm.runtime.executableTargets.findIndex(t => t.layerOrder > target.layerOrder)
            if (biggerFish < 2) return vm.runtime.executableTargets.push(target)
            vm.runtime.executableTargets.splice(biggerFish -1, 0, target)
        })
    }
    
    window.newSaveSystem = {
        UserSave,
        loadFromSource,
        makeTargetFrom
    }
    
    
    // this function shouldnt exist here and should instead exist somewhere where scratch blocks may be accessed more... consistently
    function makeInputInfo(blockJSONs) {
        const orderMap = {}
    
        for (const blockJSON of blockJSONs) {
            const blockLayout = []
            let row = 0
            let arg = 1
            let message
            let args
            while (message = blockJSON[`message${row}`]) {
                for (const arg of blockJSON[`args${row}`] ?? []) {
                    switch (arg.type) {
                    case 'input_statement':
                        blockLayout.push(['statement', arg.name])
                        break
                    case 'input_value':
                        blockLayout.push(['input', arg.name, arg.defaultBlock])
                        break
                    case 'input_dummy': break // skip as unimportant
                    case 'field_variable_getter':
                    case 'field_variable':
                        // encode variables specially cause they really do need it
                        const varType = Array.isArray(arg.variableType)
                            ? arg.variableType[0]
                            : arg.variableType
                        blockLayout.push(['variable', arg.name, arg.type, varType])
                        break
                    default:
                        // dont add it as a field if we have no serializable value
                        const thisField = ScratchBlocks.Field.TYPE_MAP_[arg.type]
                        const isSerializable = thisField.prototype.SERIALIZABLE
                        if (isSerializable && arg.name) blockLayout.push(['field', arg.name, arg.type])
                    }
                }
                row++
            }
    
            orderMap[blockJSON.type] = blockLayout
        }
    
        return orderMap
    }
    if (!window.isInTestBox) {
        const blockJSONS = []
        for (const [type, block] of Object.entries(ScratchBlocks.Blocks)) {
            if (!block.init) continue
            const fakeBlock = {jsonInit: json => blockJSONS.push({ ...json, type })}
            Object.assign(fakeBlock, block)
            try {fakeBlock.init()} catch (err) {console.log(err)}
        }
        blockJSONS.push({
            type: 'control_stop',
            message0: 'stop %1',
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'STOP_OPTION'
                }
            ]
        })
        const inputOrder = makeInputInfo(blockJSONS)
        Scratch.extensions.register({
            id: 'urmum',
            name: 'new save format',
            blocks: [
                {
                    blockType: BlockType.BUTTON,
                    text: 'make save',
                    func: 'save'
                }
            ],
            getInfo() { return this },
            async save() {
                const serializer = new UserSave(inputOrder, vm.runtime)
                window.open(URL.createObjectURL(await serializer.getZipData()))
            },
            load() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pmp';
                input.style.display = 'none'
                input.addEventListener('change', (e) => {
                    // @ts-expect-error
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader()
                        reader.onload = async ev => {
                            vm.clear()
                            await loadFromSource(ev.target.result, vm, inputOrder)
                            vm.editingTarget = vm.runtime.targets[1] ?? vm.runtime.targets[0]
                            vm.emitTargetsUpdate(false /* Don't emit project change */);
                            vm.emitWorkspaceUpdate();
                            vm.runtime.setEditingTarget(vm.editingTarget);
                            vm.runtime.ioDevices.cloud.setStage(vm.runtime.getTargetForStage());
                            vm.emitProjectLoaded()
                        }
                        reader.onerror = window.alert.bind(window)
                        reader.readAsArrayBuffer(file)
                    }
                });
            }
        })
    }
})()