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
    TERRAIN_COLOUR: '',
    GRAVITY: 80,
    MAX_VELOCITY: 3000,
    DELTA_CEILING: 0.0167,
    DELTA_FLOOR: 0.1,
    JUMP_SPEED: 1200,
}

const GAME_STATES = {
    WON: 1,
    PLAYING: 2,
    LOST: 3,
}

const player = {
    width: CONSTANTS.PLAYER_WIDTH,
    height: CONSTANTS.PLAYER_HEIGHT,
    position: {
        x: 10,
        y: 10,
    },
    velocity: {
        x: 0,
        y: 0,
    },
    score: 0,
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

let platforms = []

class Platform {
    constructor(x, y, width, height) {
        this.height = height
        this.width = width
        this.position = {
            x,
            y,
        }
        this.velocity = 400
    }
}

let canvas, context, animationFrameRequestId

function initialise() {
    canvas = document.getElementById('canvas')
    context = canvas.getContext('2d')

    canvas.width = canvas.height = CONSTANTS.CANVAS_WIDTH

    cleanStartGameLoop()
}

function cleanStartGameLoop() {
    window.cancelAnimationFrame(animationFrameRequestId)
    document.removeEventListener('keydown', handleRestart)
    registerEventListeners()

    player.score = 0
    platforms = []
    platforms.push(new Platform(0, 320, 350, 50))
    platforms.push(new Platform(410, 300, 350, 50))
    player.position = { x: 30, y: 30 }

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

    if (game.state === GAME_STATES.LOST) {
        return endGame()
    }

    animationFrameRequestId = window.requestAnimationFrame(() => {
        update()
    })
    updateDeltaTime()
}

/**
 * Messy mess of a mess
 */
function calculateMovement() {
    movePlayer()
    movePlatforms()
}

function movePlayer() {
    const playerVelocity = player.velocity

    if (playerVelocity.y > 0) {
        player.isJumping = false
    }

    if (isColliding(player, platforms) && !player.isJumping) {
        player.isColliding = true
        if (playerVelocity.y < 0.01) {
            playerVelocity.y = 0
        } else {
            playerVelocity.y = -playerVelocity.y / 3
        }
    } else if (playerVelocity.y < CONSTANTS.MAX_VELOCITY) {
        playerVelocity.y += CONSTANTS.GRAVITY
    }

    playerVelocity.y = Math.min(playerVelocity.y, CONSTANTS.MAX_VELOCITY)

    const playerPosition = player.position

    playerPosition.y += playerVelocity.y * DELTA.value
}

function movePlatforms() {
    platforms.forEach((platform) => {
        if (platform.position.x + platform.width < 0) {
            platform.position.x = canvas.width
        }
        platform.position.x -= platform.velocity * DELTA.value
    })
}

function draw() {
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)

    platforms.forEach((platform) => {
        context.fillStyle = CONSTANTS.PLATFORM_COLOUR
        context.fillRect(
            platform.position.x,
            platform.position.y,
            platform.width,
            platform.height
        )
    })

    context.fillStyle = CONSTANTS.PLAYER_COLOUR
    context.fillRect(
        player.position.x,
        player.position.y,
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
    if (player.position.y > 0 && player.isColliding) {
        player.isJumping = true
        player.isColliding = false
        player.velocity.y = -CONSTANTS.JUMP_SPEED
    }
}

function updateGameState() {
    if (player.position.y > canvas.height) {
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
    document.addEventListener('keydown', handleRestart)
}

function isColliding(player, platforms) {
    return platforms.some((platform) => {
        return performAABBTest(
            { ...player.position, width: player.width, height: player.height },
            {
                ...platform.position,
                width: platform.width,
                height: platform.height,
            }
        )
    })

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

initialise()
