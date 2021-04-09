'use strict'

import express from 'express'
import Pino from 'pino'

import { getEntries, addEntry } from './leaderboard.js'

const logger = Pino({ name: process.env.APP_NAME })

const app = express()

app.use(express.json())

const port = process.env.PORT || 3000

app.get('/health-check', (req, res) => {
    res.send(200)
})

app.get('/leaderboard', async (req, res) => {
    const leaderboard = await getEntries()
    res.send(leaderboard)
})

app.post('/leaderboard/scores', async (req, res) => {
    try {
        logger.info(req.body)
        await addEntry(req.body)
        return res.send(200)
    } catch (error) {
        logger.error(error)
        return res.send(400)
    }
})

app.listen(port, () => {
    console.log('listening on port ', port)
})
