'use strict'

const CONSTANTS = {
    CANVAS_WIDTH: 500,
    CANVAS_HEIGHT: 500,
    BG_COLOUR: '#28AFB0',
    PLAYER_COLOUR: '#1F271B',
    PLAYER_HEIGHT: 10,
    PLAYER_WIDTH: 10,
    TERRAIN_COLOUR: '',
    GRAVITY: 2,
    MAX_VELOCITY: 6,
    DELTA_CEILING: 0.0167,
    DELTA_FLOOR: 0.1,
}

const GAME_STATE = {
    player: {
        position: {
            x: 10,
            y: 10,
        },
        velocity: {
            x: 0,
            y: 0,
        },
    },
}

const DELTA = {
    now: null,
    value: null,
    then: null,
}

let canvas, context

function initialise() {
    canvas = document.getElementById('canvas')
    context = canvas.getContext('2d')

    canvas.width = canvas.height = CONSTANTS.CANVAS_WIDTH

    window.requestAnimationFrame(() => {
        update(context)
    })
}

function update() {
    calculateMovement()
    draw(context)

    window.requestAnimationFrame(() => {
        update()
    })
    updateDeltaTime()
}

function calculateMovement() {
    const playerVelocity = GAME_STATE.player.velocity

    if (playerVelocity.y < CONSTANTS.MAX_VELOCITY) {
        playerVelocity.y += CONSTANTS.GRAVITY
    }

    const playerPosition = GAME_STATE.player.position

    playerPosition.x *= 1 + playerVelocity.x * DELTA.value
    playerPosition.y *= 1 + playerVelocity.y * DELTA.value
}

function draw() {
    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.fillStyle = CONSTANTS.PLAYER_COLOUR
    context.fillRect(
        GAME_STATE.player.position.x,
        GAME_STATE.player.position.y,
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

initialise()
