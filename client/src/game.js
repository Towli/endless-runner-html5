'use strict'

import { loadImages } from './utils'

import cityBackgroundSrc from './assets/city/bright/city.png'

import runSpriteSrc from './assets/woodcutter/run.png'
import jumpSpriteSrc from './assets/woodcutter/jump.png'
import fallSpriteSrc from './assets/woodcutter/fall.png'
import platformSpriteSrc from './assets/city/platform_tile.png'

import audioSrc from './assets/hxc.mp3'

/**
todo
----
1. promote movement to objects
2. interesting platform spawns
3. create platform prop class

platform spawning
-----------------
rules:
1. no platform's xMin or xMax should overlap another's
2. if a platform's xMax is < 0 it should be removed
3. a platform's xMin and width should be randomised on spawn
4. a platform's width can be greater than the canvas width (to a sensible limit)
current solution:
- manage a FIFO queue of platforms
- a platform's x and width is determined based on the last platform in the queue, when enqueueing
- each platform has responsibility for detecting whether it needs requeueing, and does so via callback
- when drawing each frame, use a value copy of the platform queue to prevent rendering issues from 
requeueing
 */

const CONSTANTS = {
    CANVAS_WIDTH: 500,
    CANVAS_HEIGHT: 500,
    BG_COLOUR: '#28AFB0',
    PLATFORM_COLOUR: '#EE964B',
    PLAYER_COLOUR: '#1F271B',
    PLAYER_HEIGHT: 60,
    PLAYER_WIDTH: 60,
    GRAVITY: 0.002,
    MAX_VELOCITY: 1,
    JUMP_SPEED: 0.6,
    MAX_JUMPS: 2,
}

const GAME_STATES = {
    WON: 1,
    PLAYING: 2,
    LOST: 3,
    IDLE: 4,
}

const game = {
    fps: 0,
    state: GAME_STATES.IDLE,
    bestScore: 0,
    firstUpdate: true,
    audio: null,
}

const KEYCODES = {
    SPACE: 32,
}

const backdrop = {
    first: {
        image: null,
        x: 0,
    },
    second: {
        image: null,
        x: 896,
    },
}

// todo; rehome these
let canvas,
    context,
    animationFrameRequestId,
    player,
    background,
    backgroundX = 0,
    runSprite,
    jumpSprite,
    fallSprite,
    platformSprite,
    lastFrameTimeInMs = 0,
    maxFPS = 10,
    delta = 0,
    platformQueue

const timestep = 1000 / 60 // timesteps of 60fps

class SpriteManager {
    constructor() {
        this.sprites = []
    }
}

class Queue {
    constructor() {
        this.elements = []
    }

    enqueue(element) {
        this.elements.push(element)
    }

    dequeue(element) {
        return this.elements.shift()
    }

    readAll() {
        return this.elements
    }

    flush() {
        this.elements = []
    }

    getLength() {
        return this.elements.length
    }
}

class GameObject {
    constructor(context, x, y, width, height) {
        this.context = context
        this.x = x
        this.y = y
        this.height = height
        this.width = width
        this.spriteSet = {}
    }

    draw() {
        this.context.fillStyle = this.colour
        this.context.fillRect(this.x, this.y, this.width, this.height)
    }

    setSprite(label, sprite) {
        this.spriteSet[label] = sprite
    }
}

class Player extends GameObject {
    constructor(context, x, y, width, height, colour = CONSTANTS.PLAYER_COLOUR) {
        super(context, x, y, width, height)
        this.colour = colour
        this.oldX = x
        this.oldY = y
        this.velocity = {
            x: 0,
            y: 0,
        }
        this.score = 0
        this.bestScore = 0
        this.isJumping = false
        this.isFalling = true
        this.jumps = CONSTANTS.MAX_JUMPS
        this.sprite = null
        this.currentFrame = 0
        this.animationSpeed = 0.4
    }

    move() {
        if (this.velocity.y > 0) {
            if (this.isJumping) {
                this.currentFrame = 0
            }

            this.isJumping = false
            this.isFalling = true
        } else {
            this.isFalling = false
        }

        if (this.velocity.y < CONSTANTS.MAX_VELOCITY) {
            this.velocity.y += CONSTANTS.GRAVITY * timestep
        }

        this.velocity.y = Math.min(this.velocity.y, CONSTANTS.MAX_VELOCITY)
        this.oldY = this.y
        this.y += this.velocity.y * timestep
        this.x += this.velocity.x * timestep
    }

    draw() {
        this.drawSprite()
    }

    // refactor this garbo
    drawSprite() {
        let currentSprite = this.spriteSet['run']
        let numFrames = 6

        if (this.isJumping) {
            currentSprite = this.spriteSet['jump']
            numFrames = 3
        }

        if (this.isFalling) {
            currentSprite = this.spriteSet['fall']
            numFrames = 3
        }

        if (this.currentFrame >= numFrames) {
            if (this.isFalling || this.isJumping) {
                this.currentFrame = numFrames - 1
            } else {
                this.currentFrame = 0
            }
        }

        const width = currentSprite.width / numFrames
        const height = currentSprite.height
        const sourceX = Math.floor(this.currentFrame) * width
        const sourceY = 15 // hardcoded offset for good clipping, temp..

        this.context.drawImage(
            currentSprite,
            sourceX,
            sourceY,
            width - 15,
            height - 15,
            this.x,
            this.y,
            this.width,
            this.height
        )

        this.currentFrame += 0.3
    }
}

class Platform extends GameObject {
    constructor(context, x, y, width, height, colour = CONSTANTS.PLATFORM_COLOUR) {
        super(context, x, y, width, height)
        this.colour = colour
        this.height = height
        this.width = width
        this.x = x
        this.oldX = x
        this.y = y
        this.oldY = y
        this.velocity = 0.4
    }

    move(requeueHandler) {
        if (this.x + this.width < 0) {
            requeueHandler()
        }

        this.oldX = this.x
        this.x -= this.velocity * timestep
    }

    draw() {
        this.drawSprite()
    }

    drawSprite() {
        const sprite = this.spriteSet['tile']

        const width = sprite.width
        const height = sprite.height

        this.context.drawImage(sprite, this.x, this.y, this.width, this.height)
    }
}

function initialise() {
    canvas = document.getElementById('canvas')
    context = canvas.getContext('2d')

    canvas.width = canvas.height = CONSTANTS.CANVAS_WIDTH
    context.imageSmoothingEnabled = false

    backdrop.first.image = new Image()
    backdrop.first.image.src = cityBackgroundSrc
    backdrop.second.image = new Image()
    backdrop.second.image.src = cityBackgroundSrc

    runSprite = new Image()
    runSprite.src = runSpriteSrc

    jumpSprite = new Image()
    jumpSprite.src = jumpSpriteSrc

    fallSprite = new Image()
    fallSprite.src = fallSpriteSrc

    platformSprite = new Image()
    platformSprite.src = platformSpriteSrc

    platformQueue = new Queue()

    loadImages([
        backdrop.first.image,
        backdrop.second.image,
        runSprite,
        jumpSprite,
        platformSprite,
    ]).then(() => {
        registerEventListeners()
        renderMenuScreen()
    })
}

function cleanStartGameLoop() {
    startMusic()
    game.firstUpdate = true

    player = new Player(context, 50, 30, CONSTANTS.PLAYER_WIDTH, CONSTANTS.PLAYER_HEIGHT)
    player.setSprite('run', runSprite)
    player.setSprite('jump', jumpSprite)
    player.setSprite('fall', fallSprite)

    const platforms = generatePlatformVariations(30, platformSprite)

    populateInitialQueueState(platformQueue, platforms)

    game.state = GAME_STATES.PLAYING

    window.requestAnimationFrame(update)
}

function update(timestamp) {
    if (game.firstUpdate) {
        lastFrameTimeInMs = timestamp
    }

    delta += timestamp - lastFrameTimeInMs // get the delta time since last frame
    lastFrameTimeInMs = timestamp

    // simulate updates until we reach the timestep
    while (delta >= timestep) {
        calculateMovement()
        updateGameState()
        updateScore()
        handleCollisions()
        scaleDifficultyByScore()
        delta -= timestep
    }

    if (game.state === GAME_STATES.LOST) {
        return endGame()
    }

    draw()
    animationFrameRequestId = window.requestAnimationFrame(update)
    game.firstUpdate = false
}

function updateDelta(timestamp) {}

function calculateMovement() {
    player.move()

    const platforms = [...platformQueue.readAll()]

    platforms.forEach((platform) => {
        platform.move(() => {
            requeuePlatform(platformQueue)
        })
    })

    if (backdrop.first.x + 896 < 0) {
        backdrop.first.x = backdrop.second.x + 896
    }

    if (backdrop.second.x + 896 < 0) {
        backdrop.second.x = backdrop.first.x + 896
    }

    backdrop.first.x -= 1
    backdrop.second.x -= 1
}

function handleCollisions() {
    if (isColliding(player, platformQueue.readAll()) && !player.isJumping) {
        player.isColliding = true
        player.velocity.y = -player.velocity.y / 3
    }
}

function draw() {
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)
    drawBackground()

    // find better solution for this
    platformQueue
        .readAll()
        .slice(0, 5)
        .forEach((platform) => platform.draw())

    player.draw()

    drawHUD()
}

function registerEventListeners() {
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('keyup', handleKeyup)
    document.addEventListener('touchstart', handleTouchStart)
}

function handleKeydown(e) {
    if (e.keyCode === KEYCODES.SPACE) {
        if (game.state === GAME_STATES.PLAYING) {
            return jump()
        }

        if (game.state === GAME_STATES.IDLE || game.state === GAME_STATES.LOST) {
            return cleanStartGameLoop()
        }
    }
}

function handleKeyup(e) {
    if (e.keyCode === KEYCODES.SPACE) {
        // todo
    }
}

function handleTouchStart(_e) {
    if (game.state === GAME_STATES.PLAYING) {
        return jump()
    }

    if (game.state === GAME_STATES.IDLE || game.state === GAME_STATES.LOST) {
        return cleanStartGameLoop()
    }
}

function jump() {
    if (player.y > 0 && player.jumps > 0) {
        player.isJumping = true
        player.isFalling = false
        player.isColliding = false
        player.currentFrame = 0
        player.velocity.y = -CONSTANTS.JUMP_SPEED
        player.jumps--
    }
}

function updateGameState() {
    if (player.y > canvas.height || player.x + player.width < 0) {
        game.state = GAME_STATES.LOST
    }
}

function endGame() {
    window.cancelAnimationFrame(animationFrameRequestId) // not sure if this does much here
    setBestScore()
    renderGameOverScreen()
}

function isColliding(player, platforms) {
    const performAABBTest = (rectA, rectB) => {
        return (
            rectA.x + rectA.width > rectB.x &&
            rectA.x < rectB.x + rectB.width &&
            rectA.y + rectA.height > rectB.y &&
            rectA.y < rectB.y + rectB.height
        )
    }

    const collidedFromLeft = (rectA, rectB) => {
        return rectA.x + rectA.width < rectB.oldX
    }

    const collidedFromBottom = (rectA, rectB) => {
        return rectA.oldY > rectB.y + rectB.height
    }

    for (let i = 0; i < platforms.length; i++) {
        const playerRect = {
            ...player,
            width: player.width,
            height: player.height,
        }
        const platformRect = {
            x: platforms[i].x,
            y: platforms[i].y,
            oldX: platforms[i].oldX,
            width: platforms[i].width,
            height: platforms[i].height,
        }

        const collision = performAABBTest(playerRect, platformRect)

        if (collision) {
            const leftCollision = collidedFromLeft(playerRect, platformRect)

            if (leftCollision) {
                return (player.velocity.x = -0.5)
            }

            const bottomCollision = collidedFromBottom(playerRect, platformRect)

            if (bottomCollision) {
                return (player.velocity.y = 0.5)
            }

            player.jumps = CONSTANTS.MAX_JUMPS
            return (player.y = platforms[i].y - player.height)
        }
    }
}

function renderMenuScreen() {
    document.addEventListener('keydown', handleKeydown)
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(backdrop.first.image, 0, 0, 896, 504)
    context.textAlign = 'center'
    context.font = '24px Tahoma'
    context.fillStyle = 'white'
    context.fillText('runna', canvas.width / 2, canvas.height / 3)
    context.font = '16px Tahoma'
    context.fillStyle = 'black'
    context.fillRect(canvas.width / 2 - 50, canvas.height / 2 - 20, 100, 30)
    context.fillStyle = 'white'
    context.fillText(`space to start`, canvas.width / 2, canvas.height / 2)
}

function renderGameOverScreen() {
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(backdrop.first.image, 0, 0, 896, 504)
    context.textAlign = 'center'
    context.font = '24px Tahoma'
    context.fillStyle = 'white'
    context.fillText('game over', canvas.width / 2, canvas.height / 3)
    context.font = '16px Tahoma'
    context.fillText(`score: ${player.score}`, canvas.width / 2, canvas.height / 2)
    context.font = '16px Tahoma'
    context.fillText(`best: ${game.bestScore}`, canvas.width / 2, canvas.height / 1.75)
    context.font = '16px Tahoma'
    context.fillText('press space or touch ( ͡° ͜ʖ ͡°)', canvas.width / 2, canvas.height / 1.5)
}

function drawFps() {
    context.font = '14px Tahoma'
    context.fillStyle = 'black'
    context.fillText(`fps:  ${game.fps}`, 50, 40)
}

function drawScore() {
    context.font = '14px Tahoma'
    context.fillStyle = 'black'
    context.fillText(`score: ${player.score}`, 50, 20)
    context.fillText(`best: ${game.bestScore}`, canvas.width - 40, 20)
}

function drawHUD() {
    // drawFps()
    drawScore()
}

function updateScore() {
    player.score++
}

function startMusic() {
    if (!game.audio) {
        game.audio = new Audio(audioSrc)
    }
    game.audio.play()
    game.audio.loop = true
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min
}

function scaleDifficultyByScore() {
    const threshold = 400

    if (player.score >= threshold * 4) {
        return
    }

    const velocityIncease = 0.07
    if (player.score % threshold === 0) {
        platformQueue.readAll().forEach((platform) => (platform.velocity += velocityIncease))
    }
    player.animationSpeed += 0.1
}

function setBestScore() {
    if (player.score > game.bestScore) {
        game.bestScore = player.score
    }
}

function drawBackground() {
    context.drawImage(backdrop.first.image, backdrop.first.x, 0, 896, 504)
    context.drawImage(backdrop.second.image, backdrop.second.x, 0, 896, 504)
}

/**
    build an array of platform variations. not concerned about their positions 
    as this will get set at the poiint of enqueuing (based on the element in front)
 */
function generatePlatformVariations(amount, sprite) {
    const maxWidth = canvas.width
    const minWidth = maxWidth / 3
    const platformHeight = 50 // fixed value for now

    const platforms = []

    for (let i = 0; i < amount; i++) {
        const platform = new Platform(
            context,
            0,
            0,
            getRandomArbitrary(70, canvas.width),
            platformHeight
        )

        platform.setSprite('tile', sprite)

        platforms.push(platform)
    }

    return platforms
}

function populateInitialQueueState(queue, platforms) {
    queue.flush()

    for (let i = 0; i < platforms.length; i++) {
        if (i === 0) {
            platforms[i].x = canvas.width / 2 // first platform should be easy to land on
        } else {
            const previousPlatform = platforms[i - 1]
            const randomOffset = getRandomArbitrary(50, 150)

            platforms[i].x = previousPlatform.x + previousPlatform.width + randomOffset
        }

        platforms[i].y = getRandomArbitrary(canvas.height - 200, canvas.height - 50)

        queue.enqueue(platforms[i])
    }

    return queue
}

function requeuePlatform(queue) {
    const platform = queue.dequeue()

    const platforms = queue.readAll()
    const randomOffset = getRandomArbitrary(50, 150)

    platform.x =
        platforms[platforms.length - 1].x + platforms[platforms.length - 1].width + randomOffset
    platform.y = getRandomArbitrary(canvas.height - 200, canvas.height - 50)

    queue.enqueue(platform)
}

initialise()
