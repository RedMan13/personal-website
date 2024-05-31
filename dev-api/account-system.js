const multer = require('multer')
const fs = require('fs/promises')
const path = require('path')
const { createCanvas, loadImage } = require('canvas')
const profileHandle = multer({
    dest: './tmp',
    preservePath: true
})

function handleOnFail(res) {
    return function(err) {
        res.status(422)
        res.send(`Failed to handle registration; ${err}`)
    }
}
function _makeImageCopier(tagName, size) {
    const canvas = createCanvas(...size)
    const ctx = canvas.getContext('2d')
    return async function(file, username) {
        const fileType = file.split('.').at(-1)
        const destFile = path.resolve(`./profiles/${username}-${tagName}.${fileType}`)
        if (file.endsWith('.svg')) return fs.rename(file, destFile)
    }
}
const clonePfp = _makeImageCopier('pfp', [255, 255])
module.exports = function(app) {
    const createForm = profileHandle.fields([
        { name: 'pfp', maxCount: 1 },
        { name: 'banner', maxCount: 1 }
    ])
    app.post('/handle-account', createForm, (req, res) => {
        console.log(req.files, req.body)
    })
}