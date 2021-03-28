'use strict'

/**
 * todo:
 * 1. model player as a class
 * 2. promote draw and movement to objects
 * 3. cleanup collision logic
 * 4. fix collision clipping bug
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
    MAX_VELOCITY: 1000,
    DELTA_CEILING: 0.0167,
    DELTA_FLOOR: 0.1,
    JUMP_SPEED: 800,
}

const GAME_STATES = {
    WON: 1,
    PLAYING: 2,
    LOST: 3,
}

const game = {
    state: null,
}

const DELTA = {
    now: null,
    value: null,
    then: null,
}

const KEYCODES = {
    JUMP: 32,
}

class Player {
    constructor(x, y, width, height) {
        this.height = height
        this.width = width
        this.x = x
        this.y = y
        this.velocity = {
            x: 0,
            y: 0,
        }
        this.score = 0
        this.isJumping = false
    }
}

class Platform {
    constructor(x, y, width, height) {
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
    startMusic()

    cleanStartGameLoop()
}

function cleanStartGameLoop() {
    window.cancelAnimationFrame(animationFrameRequestId)
    document.removeEventListener('keydown', handleRestart)
    registerEventListeners()

    player = new Player(50, 30, CONSTANTS.PLAYER_WIDTH, CONSTANTS.PLAYER_HEIGHT)
    platforms = []
    platforms.push(new Platform(0, 320, 250, 50))
    platforms.push(new Platform(370, 300, 250, 50))

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
        }
        platform.x -= platform.velocity * DELTA.value
    })
}

function draw() {
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)

    platforms.forEach((platform) => {
        context.fillStyle = CONSTANTS.PLATFORM_COLOUR
        context.fillRect(
            platform.x,
            platform.y,
            platform.width,
            platform.height
        )
    })

    context.fillStyle = CONSTANTS.PLAYER_COLOUR
    context.fillRect(
        player.x,
        player.y,
        CONSTANTS.PLAYER_WIDTH,
        CONSTANTS.PLAYER_HEIGHT
    )

    renderScore()
}

function updateDeltaTime() {
    DELTA.now = Date.now()
    DELTA.value = Math.min(
        (DELTA.now - DELTA.then) / 1000,
        CONSTANTS.DELTA_CEILING
    )
    DELTA.then = DELTA.now
}

function registerEventListeners() {
    document.addEventListener('keydown', handleKeydown)
}

function handleKeydown(e) {
    if (e.keyCode === KEYCODES.JUMP) {
        jump()
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
    if (e.keyCode === KEYCODES.JUMP) {
        cleanStartGameLoop()
    }
}

function endGame() {
    document.removeEventListener('keydown', handleKeydown)
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.font = '24px Tahoma'
    context.fillStyle = 'white'
    context.fillText('game over', canvas.width / 2, canvas.height / 2)
    context.font = '16px Tahoma'
    context.fillText('<press space>', canvas.width / 2, canvas.height / 2 + 50)
    document.addEventListener('keydown', handleRestart)
}

function isColliding(player, platforms) {
    for (let i = 0; i < platforms.length; i++) {
        const collision = performAABBTest(
            { ...player, width: player.width, height: player.height },
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

function renderScore() {
    context.font = '16px Tahoma'
    context.fillStyle = 'white'
    context.fillText(player.score, 15, 20)
}

function updateScore() {
    player.score++
}

function startMusic() {
    // todo
}

initialise()
