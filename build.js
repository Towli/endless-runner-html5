'use strict'

const fs = require('fs')
const config = require('./webpack.config.js')
const webpack = require('webpack')

const compiler = webpack(config)

const checkDirForExistence = (dir) => {
    return new Promise((resolve, reject) => {
        fs.stat(dir, (err, stats) => {
            if (err) {
                return resolve(false)
            }

            return resolve(true)
        })
    })
}

;(async () => {
    const doesDirExist = await checkDirForExistence('dist')

    console.log(doesDirExist)

    if (doesDirExist) {
        fs.rmdirSync('dist', { recursive: true })
    }

    fs.mkdirSync('dist')
    fs.copyFileSync('src/index.html', 'dist/index.html')
    compiler.run((err, stats) => {
        if (err) console.log(err)
        if (stats) console.log(stats)
    })
})()
