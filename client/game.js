'use strict'

/**
 * todo:
 * 1. promote movement to objects
 * 2. cleanup collision logic
 * 3. develop directional collision detection
 */

const CONSTANTS = {
    CANVAS_WIDTH: 500,
    CANVAS_HEIGHT: 500,
    BG_COLOUR: '#28AFB0',
    PLATFORM_COLOUR: '#EE964B',
    PLAYER_COLOUR: '#1F271B',
    PLAYER_HEIGHT: 20,
    PLAYER_WIDTH: 20,
    GRAVITY: 70,
    MAX_VELOCITY: 1200,
    DELTA_CEILING: 0.0167,
    DELTA_FLOOR: 0.1,
    JUMP_SPEED: 1000,
}

const GAME_STATES = {
    WON: 1,
    PLAYING: 2,
    LOST: 3,
    IDLE: 4,
}

const game = {
    state: GAME_STATES.IDLE,
}

const DELTA = {
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
        this.velocity = {
            x: 0,
            y: 0,
        }
        this.score = 0
        this.isJumping = false
    }
}

class Platform extends GameObject {
    constructor(context, x, y, width, height, colour = CONSTANTS.PLATFORM_COLOUR) {
        super(context, x, y, width, height)
        this.colour = colour
        this.height = height
        this.width = width
        this.x = x
        this.y = y
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
    window.cancelAnimationFrame(animationFrameRequestId)
    startMusic()

    registerEventListeners()
    player = new Player(context, 50, 30, CONSTANTS.PLAYER_WIDTH, CONSTANTS.PLAYER_HEIGHT)

    platforms = []
    platforms.push(new Platform(context, 0, getRandomArbitrary(400, canvas.height - 50), 270, 50))
    platforms.push(new Platform(context, 370, getRandomArbitrary(400, canvas.height - 50), 270, 50))

    game.state = GAME_STATES.PLAYING

    window.requestAnimationFrame(() => {
        update()
    })
}

function update() {
    calculateMovement()
    draw()
    updateGameState()
    updateScore()
    handleCollisions()

    if (game.state === GAME_STATES.LOST) {
        return endGame()
    }

    animationFrameRequestId = window.requestAnimationFrame(() => {
        update()
    })
    updateDeltaTime()
}

function calculateMovement() {
    movePlayer()
    movePlatforms()
}

function handleCollisions() {
    if (isColliding(player, platforms) && !player.isJumping) {
        player.isColliding = true
        player.velocity.y = -player.velocity.y / 2
    }
}

function movePlayer() {
    if (player.velocity.y > 0) {
        player.isJumping = false
    }

    if (player.velocity.y < CONSTANTS.MAX_VELOCITY) {
        player.velocity.y += CONSTANTS.GRAVITY
    }

    player.velocity.y = Math.min(player.velocity.y, CONSTANTS.MAX_VELOCITY)
    player.y += player.velocity.y * DELTA.value
}

function movePlatforms() {
    platforms.forEach((platform) => {
        if (platform.x + platform.width < 0) {
            platform.x = canvas.width
            platform.y = getRandomArbitrary(300, canvas.height - 50)
        }
        platform.x -= platform.velocity * DELTA.value
    })
}

function draw() {
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)

    platforms.forEach((platform) => platform.draw())

    player.draw()

    renderScore()
}

function updateDeltaTime() {
    DELTA.now = Date.now()
    DELTA.value = Math.min((DELTA.now - DELTA.then) / 1000, CONSTANTS.DELTA_CEILING)
    DELTA.then = DELTA.now
}

function registerEventListeners() {
    document.addEventListener('keydown', handleKeydown)
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

function jump() {
    if (player.y > 0 && player.isColliding) {
        player.isJumping = true
        player.isColliding = false
        player.velocity.y = -CONSTANTS.JUMP_SPEED
    }
}

function updateGameState() {
    if (player.y > canvas.height) {
        game.state = GAME_STATES.LOST
    }
}

function handleRestart(e) {
    if (e.keyCode === KEYCODES.SPACE) {
        cleanStartGameLoop()
    }
}

function endGame() {
    renderGameOverScreen()
}

function isColliding(player, platforms) {
    for (let i = 0; i < platforms.length; i++) {
        const collision = performAABBTest(
            {
                ...player,
                width: player.width,
                height: player.height,
            },
            {
                x: platforms[i].x,
                y: platforms[i].y,
                width: platforms[i].width,
                height: platforms[i].height,
            }
        )

        if (collision) {
            player.y = platforms[i].y - player.height
            return platforms[i]
        }
    }

    function performAABBTest(rectA, rectB) {
        return (
            rectA.x + rectA.width > rectB.x &&
            rectA.x < rectB.x + rectB.width &&
            rectA.y + rectA.height > rectB.y &&
            rectA.y < rectB.y + rectB.height
        )
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

function renderScore() {
    context.font = '16px Tahoma'
    context.fillStyle = 'black'
    context.fillText(player.score, 30, 20)
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
