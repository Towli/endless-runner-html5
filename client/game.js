'use strict'

const CONSTANTS = {
    CANVAS_WIDTH: 500,
    CANVAS_HEIGHT: 500,
    BG_COLOUR: '#28AFB0',
    PLAYER_COLOUR: '#1F271B',
    PLAYER_HEIGHT: 20,
    PLAYER_WIDTH: 20,
    TERRAIN_COLOUR: '',
    GRAVITY: 80,
    MAX_VELOCITY: 3000,
    DELTA_CEILING: 0.0167,
    DELTA_FLOOR: 0.1,
    JUMP_SPEED: 1000,
}

const GAME_STATES = {
    WON: 1,
    PLAYING: 2,
    LOST: 3,
}

const player = {
    position: {
        x: 10,
        y: 10,
    },
    velocity: {
        x: 0,
        y: 0,
    },
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

let canvas, context, animationFrameRequestId

function initialise() {
    canvas = document.getElementById('canvas')
    context = canvas.getContext('2d')

    canvas.width = canvas.height = CONSTANTS.CANVAS_WIDTH

    registerEventListeners()

    game.state = GAME_STATES.PLAYING

    window.requestAnimationFrame(() => {
        update(context)
    })
}

function update() {
    calculateMovement()
    draw(context)
    updateGameState()

    if (game.state === GAME_STATES.LOST) {
        return endGame()
    }

    animationFrameRequestId = window.requestAnimationFrame(() => {
        update()
    })
    updateDeltaTime()
}

function calculateMovement() {
    const playerVelocity = player.velocity

    if (playerVelocity.y < CONSTANTS.MAX_VELOCITY) {
        playerVelocity.y += CONSTANTS.GRAVITY
    }

    playerVelocity.y = Math.min(playerVelocity.y, CONSTANTS.MAX_VELOCITY)

    const playerPosition = player.position

    playerPosition.y += playerVelocity.y * DELTA.value
}

function draw() {
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.fillStyle = CONSTANTS.PLAYER_COLOUR
    context.fillRect(
        player.position.x,
        player.position.y,
        CONSTANTS.PLAYER_WIDTH,
        CONSTANTS.PLAYER_HEIGHT
    )
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
    if (player.position.y > 0) {
        player.velocity.y = -CONSTANTS.JUMP_SPEED
    }
}

function updateGameState() {
    console.log(player.position.y, canvas.height)
    if (player.position.y > canvas.height) {
        game.state = GAME_STATES.LOST
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
}

initialise()
