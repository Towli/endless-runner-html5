'use strict'

/**
 * todo:
 * 1. promote movement to objects
 * 2. interesting platform spawns
 * 3. create platform prop class
 * 4. impl double jump
 */

const CONSTANTS = {
    CANVAS_WIDTH: 500,
    CANVAS_HEIGHT: 500,
    BG_COLOUR: '#28AFB0',
    PLATFORM_COLOUR: '#EE964B',
    PLAYER_COLOUR: '#1F271B',
    PLAYER_HEIGHT: 20,
    PLAYER_WIDTH: 20,
    GRAVITY: 2500,
    MAX_VELOCITY: 1200,
    JUMP_SPEED: 600,
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
}

const DELTA = {
    CEILING: 1000 / 60, // 60 fps
}

const delta = {
    now: null,
    value: null,
    then: null,
}

const KEYCODES = {
    SPACE: 32,
}

class GameObject {
    constructor(context, x, y, width, height) {
        this.context = context
        this.x = x
        this.y = y
        this.height = height
        this.width = width
    }

    draw() {
        this.context.fillStyle = this.colour
        this.context.fillRect(this.x, this.y, this.width, this.height)
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
        this.isJumping = false
        this.jumps = CONSTANTS.MAX_JUMPS
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
        this.velocity = 400
    }
}

let canvas, context, animationFrameRequestId, player
let platforms = []

function initialise() {
    canvas = document.getElementById('canvas')
    context = canvas.getContext('2d')

    canvas.width = canvas.height = CONSTANTS.CANVAS_WIDTH

    registerEventListeners()
    renderMenuScreen()
}

function cleanStartGameLoop() {
    DELTA.then = 0
    startMusic()

    player = new Player(context, 50, 30, CONSTANTS.PLAYER_WIDTH, CONSTANTS.PLAYER_HEIGHT)

    platforms = []
    platforms.push(new Platform(context, 50, getRandomArbitrary(400, canvas.height - 50), 270, 50))
    platforms.push(new Platform(context, 400, getRandomArbitrary(400, canvas.height - 50), 270, 50))

    game.state = GAME_STATES.PLAYING

    window.requestAnimationFrame(update)
}

function update() {
    updateDeltaTime()

    if (DELTA.value < DELTA.CEILING) {
        calculateMovement()
        draw()
        updateGameState()
        updateScore()
        handleCollisions()

        if (game.state === GAME_STATES.LOST) {
            return endGame()
        }
    }

    animationFrameRequestId = window.requestAnimationFrame(update)
}

function calculateMovement() {
    movePlayer()
    movePlatforms()
}

function handleCollisions() {
    if (isColliding(player, platforms) && !player.isJumping) {
        player.isColliding = true
        player.velocity.y = -player.velocity.y / 3
    }
}

function movePlayer() {
    if (player.velocity.y > 0) {
        player.isJumping = false
    }

    if (player.velocity.y < CONSTANTS.MAX_VELOCITY) {
        player.velocity.y += CONSTANTS.GRAVITY * DELTA.value
    }

    player.velocity.y = Math.min(player.velocity.y, CONSTANTS.MAX_VELOCITY)
    player.oldY = player.y
    player.y += player.velocity.y * DELTA.value
    player.x += player.velocity.x * DELTA.value
}

function movePlatforms() {
    platforms.forEach((platform) => {
        if (platform.x + platform.width < 0) {
            platform.x = canvas.width
            platform.y = getRandomArbitrary(300, canvas.height - 50)
        }

        platform.oldX = platform.x
        platform.x -= platform.velocity * DELTA.value
    })
}

function draw() {
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)

    platforms.forEach((platform) => platform.draw())

    player.draw()

    drawHUD()
}

function updateDeltaTime() {
    DELTA.now = Date.now()
    const currentDelta = (DELTA.now - DELTA.then) / 1000
    DELTA.value = currentDelta
    DELTA.then = DELTA.now

    game.fps = Math.round(1 / currentDelta)
}

function registerEventListeners() {
    document.addEventListener('keydown', handleKeydown)
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
        player.isColliding = false
        player.velocity.y = -CONSTANTS.JUMP_SPEED
        player.jumps--
    }
}

function updateGameState() {
    if (player.y > canvas.height) {
        game.state = GAME_STATES.LOST
    }
}

function endGame() {
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
                return (player.velocity.x = -1000)
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
    context.textAlign = 'center'
    context.font = '24px Tahoma'
    context.fillStyle = 'black'
    context.fillText('runna', canvas.width / 2, canvas.height / 3)
    context.font = '16px Tahoma'
    context.fillText(`space to start`, canvas.width / 2, canvas.height / 2)
}

function renderGameOverScreen() {
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.font = '24px Tahoma'
    context.fillStyle = 'black'
    context.fillText('game over', canvas.width / 2, canvas.height / 3)
    context.font = '16px Tahoma'
    context.fillText(`score: ${player.score}`, canvas.width / 2, canvas.height / 2)
    context.font = '16px Tahoma'
    context.fillText('[press space]', canvas.width / 2, canvas.height / 1.5)
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
}

function drawHUD() {
    drawFps()
    drawScore()
}

function updateScore() {
    player.score++
}

function startMusic() {
    document.getElementById('audio').play().catch(console.log)
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min
}

initialise()
